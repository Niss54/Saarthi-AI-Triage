"""
Saarthi AI — Voice Triage Agent
LiveKit Agent Worker that connects patients via voice for medical triage.
Uses Sarvam AI (STT/TTS) + Google Gemini for multilingual Indian hospital triage.

Run with: python voice_agent.py dev
"""
import asyncio
import json
import os
import re
import random
import uuid
from datetime import datetime
from dotenv import load_dotenv

import httpx
import google.generativeai as genai

from sarvam_stt import transcribe_audio
from sarvam_tts import text_to_speech

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

FASTAPI_BASE = "http://localhost:8000"

VOICE_TRIAGE_PROMPT = """You are Saarthi, an AI medical triage assistant at KGMU Lucknow. A patient is speaking to you via voice. Your job:

1. Listen to symptoms carefully.
2. Ask ONE short follow-up question if needed (not more).
3. Determine: severity (critical/moderate/mild), department, urgency reason.
4. Respond in the SAME LANGUAGE as the patient.

CRITICAL INSTRUCTION FOR PRONUNCIATION: 
You MUST write your response in the NATIVE SCRIPT of the language (e.g., use Devanagari script for Hindi "आप कैसे हैं", not Latin script "Aap kaise hain"). The TTS engine requires native script to pronounce correctly.

For critical cases in Hindi, say: "आपकी स्थिति गंभीर है। कृपया तुरंत इमरजेंसी विभाग में जाएं।"
For normal cases, tell them the department and wait time.

Keep responses VERY SHORT (1-2 sentences max) for fast processing. No markdown.

After your spoken response, provide this JSON block at the END:
###TRIAGE_JSON###
{"triage_level": "critical|moderate|mild", "department": "Department Name", "wait_time_minutes": N, "ai_reasoning": "brief reason"}
###END_JSON###

Patient message: {patient_text}
Detected language: {language}
"""

GREETINGS = {
    "hi-IN": "नमस्ते! मैं सारथी हूँ, केजीएमयू का एआई सहायक। आप अपने लक्षण बता सकते हैं।",
    "en-IN": "Hello! I'm Saarthi, KGMU's AI assistant. Please describe your symptoms.",
    "bn-IN": "নমস্কার! আমি সারথি, আপনার লক্ষণগুলি বলুন।",
    "ta-IN": "வணக்கம்! நான் சாரதி. உங்கள் அறிகுறிகளை சொல்லுங்கள்.",
    "te-IN": "నమస్కారం! నేను సారథి. దయచేసి మీ లక్షణాలను చెప్పండి.",
    "mr-IN": "नमस्कार! मी सारथी आहे. कृपया तुमची लक्षणे सांगा.",
}


def parse_triage_json(response_text: str) -> dict | None:
    """Extract triage JSON from Gemini response."""
    match = re.search(r'###TRIAGE_JSON###\s*(.*?)\s*###END_JSON###', response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    
    # Fallback: try to find any JSON object
    match = re.search(r'\{[^{}]*"triage_level"[^{}]*\}', response_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    
    return None


def clean_response_text(response_text: str) -> str:
    """Remove JSON block from response to get clean spoken text."""
    cleaned = re.sub(r'###TRIAGE_JSON###.*?###END_JSON###', '', response_text, flags=re.DOTALL)
    cleaned = re.sub(r'\{[^{}]*"triage_level"[^{}]*\}', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()


async def run_gemini_triage(patient_text: str, language: str) -> dict:
    """
    Run Gemini triage analysis on patient text.
    Returns: dict with 'spoken_response', 'triage_data'
    """
    prompt = VOICE_TRIAGE_PROMPT.format(patient_text=patient_text, language=language)
    
    try:
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=150,
                temperature=0.4,
            )
        )
        full_text = response.text.strip()
        
        triage_data = parse_triage_json(full_text)
        spoken_text = clean_response_text(full_text)
        
        if not triage_data:
            # Fallback triage
            complaint_lower = patient_text.lower()
            danger_words = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh']
            is_critical = any(w in complaint_lower for w in danger_words)
            
            triage_data = {
                "triage_level": "critical" if is_critical else "mild",
                "department": "Emergency" if is_critical else "General OPD",
                "wait_time_minutes": 0 if is_critical else random.randint(20, 45),
                "ai_reasoning": "Voice triage via Gemini with fallback classification."
            }
        
        return {
            "spoken_response": spoken_text,
            "triage_data": triage_data,
        }
    except Exception as e:
        print(f"Gemini triage error: {e}")
        return {
            "spoken_response": "माफ़ कीजिए, तकनीकी समस्या आ गई है। कृपया टेक्स्ट का उपयोग करें।" if "hi" in language else "Sorry, technical issue. Please use text triage.",
            "triage_data": {
                "triage_level": "mild",
                "department": "General OPD",
                "wait_time_minutes": 30,
                "ai_reasoning": f"Gemini error: {str(e)}"
            },
        }


async def add_patient_to_queue(name: str, age: int, gender: str, complaint: str, triage_data: dict) -> dict | None:
    """Post triage result to FastAPI queue so dashboard updates."""
    try:
        token = f"EMG-{random.randint(1000,9999)}" if triage_data["triage_level"] == "critical" else f"APL-{random.randint(1000,9999)}"
        
        payload = {
            "id": str(uuid.uuid4()),
            "token": token,
            "name": name,
            "age": age,
            "triageLevel": triage_data["triage_level"],
            "chiefComplaint": complaint,
            "department": triage_data["department"],
            "waitTime": triage_data["wait_time_minutes"],
            "status": "waiting",
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "isEmergency": triage_data["triage_level"] == "critical",
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{FASTAPI_BASE}/api/queue/add", json=payload)
            if resp.status_code == 200:
                return resp.json()
        return None
    except Exception as e:
        print(f"Queue add error: {e}")
        return None


async def process_voice_triage(audio_bytes: bytes, language: str = "hi-IN") -> dict:
    """
    Full voice triage pipeline:
    1. Sarvam STT: audio → text
    2. Gemini: text → triage + response
    3. Sarvam TTS: response → audio
    4. Add to queue
    
    Returns dict with all results.
    """
    # Step 1: Speech to Text
    stt_result = await transcribe_audio(audio_bytes, language_code=language)
    transcript = stt_result.get("transcript", "")
    detected_lang = stt_result.get("language_code", language)
    
    if not transcript:
        error_msg = "Audio samajh nahi aaya. Kripya dubara bolein."
        tts_result = await text_to_speech(error_msg, language_code=language)
        return {
            "transcript": "",
            "spoken_response": error_msg,
            "triage_data": None,
            "audio_base64": tts_result.get("audio_base64", ""),
            "language": language,
        }
    
    # Step 2: Gemini Triage
    gemini_result = await run_gemini_triage(transcript, detected_lang)
    spoken_response = gemini_result["spoken_response"]
    triage_data = gemini_result["triage_data"]
    
    # Step 3: Text to Speech
    tts_result = await text_to_speech(spoken_response, language_code=detected_lang)
    
    # Step 4: Add to queue
    queue_result = await add_patient_to_queue(
        name="Voice Patient",
        age=30,
        gender="Unknown",
        complaint=transcript,
        triage_data=triage_data,
    )
    
    token = "APL-0000"
    if queue_result:
        token = queue_result.get("token", token)
    elif triage_data["triage_level"] == "critical":
        token = f"EMG-{random.randint(1000,9999)}"
    else:
        token = f"APL-{random.randint(1000,9999)}"
    
    return {
        "transcript": transcript,
        "spoken_response": spoken_response,
        "triage_data": {
            **triage_data,
            "token": token,
            "isEmergency": triage_data["triage_level"] == "critical",
        },
        "audio_base64": tts_result.get("audio_base64", ""),
        "language": detected_lang,
    }


if __name__ == "__main__":
    print("Saarthi AI Voice Agent")
    print("This module provides voice triage processing.")
    print("It is called by the FastAPI server endpoints.")
    print("Start the server with: uvicorn main:app --reload")
