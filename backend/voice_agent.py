"""
Saarthi AI — Voice Triage Agent
Uses Sarvam AI (STT/TTS) + Google Gemini for multilingual Indian hospital triage.
Optimized for speed: parallel processing where possible.
"""
import asyncio
import json
import os
import re
import random
import uuid
import time
from datetime import datetime
from dotenv import load_dotenv

import httpx
import google.generativeai as genai

from sarvam_stt import transcribe_audio
from sarvam_tts import text_to_speech

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
gemini_model = genai.GenerativeModel("gemini-2.0-flash")

FASTAPI_BASE = "http://localhost:8000"

VOICE_TRIAGE_PROMPT = """You are Saarthi, an AI medical triage assistant at KGMU Lucknow hospital.

RULES:
- Respond ONLY in native script ({language}). For Hindi use Devanagari: "नमस्ते", NOT "Namaste"
- Keep response under 2 sentences. This is voice output.
- No markdown, no bullets, no special characters.
- After spoken text, append triage JSON.

Analyze patient symptoms and respond with department recommendation and wait time.

Departments: Emergency, Medicine, Orthopaedics, Gynaecology, Paediatrics, ENT, Eye OPD, Dermatology, General OPD, Cardiology, Neurology, Pulmonology, Surgery

Patient said: {patient_text}

Format your response EXACTLY like this:
[Your 1-2 sentence spoken response in native script]
###TRIAGE_JSON###
{{"triage_level": "critical|moderate|mild", "department": "Department Name", "wait_time_minutes": N, "ai_reasoning": "brief reason"}}
###END_JSON###"""

GREETINGS = {
    "hi-IN": "नमस्ते! मैं सारथी हूँ, केजीएमयू का एआई सहायक। आप अपने लक्षण बताइए।",
    "en-IN": "Hello! I'm Saarthi, KGMU's AI assistant. Please describe your symptoms.",
    "bn-IN": "নমস্কার! আমি সারথি। আপনার লক্ষণগুলি বলুন।",
    "ta-IN": "வணக்கம்! நான் சாரதி. உங்கள் அறிகுறிகளை சொல்லுங்கள்.",
    "te-IN": "నమస్కారం! నేను సారథి. మీ లక్షణాలను చెప్పండి.",
    "mr-IN": "नमस्कार! मी सारथी आहे. कृपया तुमची लक्षणे सांगा.",
}

ERROR_MESSAGES = {
    "hi-IN": "ऑडियो समझ नहीं आया। कृपया दोबारा बोलिए।",
    "en-IN": "Could not understand audio. Please speak again.",
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
    cleaned = cleaned.strip()
    # Remove any remaining markdown artifacts
    cleaned = re.sub(r'[*_#`]', '', cleaned)
    return cleaned


async def run_gemini_triage(patient_text: str, language: str) -> dict:
    """Run Gemini triage — optimized for speed with low token limit."""
    prompt = VOICE_TRIAGE_PROMPT.format(patient_text=patient_text, language=language)
    
    try:
        t0 = time.time()
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=200,
                temperature=0.3,
            )
        )
        elapsed = round(time.time() - t0, 2)
        full_text = response.text.strip()
        print(f"Gemini OK [{elapsed}s]: '{full_text[:60]}...'")
        
        triage_data = parse_triage_json(full_text)
        spoken_text = clean_response_text(full_text)
        
        if not triage_data:
            complaint_lower = patient_text.lower()
            danger_words = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh',
                          'सीने', 'दर्द', 'सांस', 'बेहोश', 'खून', 'blood', 'heart', 'attack']
            is_critical = any(w in complaint_lower for w in danger_words)
            
            triage_data = {
                "triage_level": "critical" if is_critical else "mild",
                "department": "Emergency" if is_critical else "General OPD",
                "wait_time_minutes": 0 if is_critical else random.randint(20, 45),
                "ai_reasoning": "Fallback classification"
            }
        
        return {"spoken_response": spoken_text, "triage_data": triage_data}
    except Exception as e:
        print(f"Gemini ERROR: {e}")
        err_msg = ERROR_MESSAGES.get(language, ERROR_MESSAGES["en-IN"])
        return {
            "spoken_response": err_msg,
            "triage_data": {
                "triage_level": "mild",
                "department": "General OPD",
                "wait_time_minutes": 30,
                "ai_reasoning": f"Gemini error: {str(e)}"
            },
        }


async def add_patient_to_queue(name: str, age: int, gender: str, complaint: str, triage_data: dict) -> dict | None:
    """Post triage result to FastAPI queue (fire-and-forget)."""
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
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(f"{FASTAPI_BASE}/api/queue/add", json=payload)
            if resp.status_code == 200:
                return resp.json()
        return None
    except Exception as e:
        print(f"Queue add error: {e}")
        return None


async def process_voice_triage(audio_bytes: bytes, language: str = "hi-IN") -> dict:
    """
    Full voice triage pipeline — optimized for speed:
    1. Sarvam STT: audio → text
    2. Gemini: text → triage + response  
    3. Sarvam TTS: response → audio (run in parallel with queue add)
    """
    pipeline_start = time.time()
    
    # Step 1: Speech to Text
    t0 = time.time()
    stt_result = await transcribe_audio(audio_bytes, language_code=language)
    transcript = stt_result.get("transcript", "")
    detected_lang = stt_result.get("language_code", language)
    print(f"[Pipeline] STT: {round(time.time()-t0, 2)}s — transcript='{transcript[:50]}'")
    
    if not transcript:
        error_msg = ERROR_MESSAGES.get(language, ERROR_MESSAGES["en-IN"])
        tts_result = await text_to_speech(error_msg, language_code=language)
        return {
            "transcript": "",
            "spoken_response": error_msg,
            "triage_data": None,
            "audio_base64": tts_result.get("audio_base64", ""),
            "language": language,
        }
    
    # Step 2: Gemini Triage
    t0 = time.time()
    gemini_result = await run_gemini_triage(transcript, detected_lang)
    spoken_response = gemini_result["spoken_response"]
    triage_data = gemini_result["triage_data"]
    print(f"[Pipeline] Gemini: {round(time.time()-t0, 2)}s")
    
    # Step 3 & 4: TTS and Queue Add — run in PARALLEL for speed
    t0 = time.time()
    tts_task = text_to_speech(spoken_response, language_code=detected_lang)
    
    # Generate token early
    token = f"EMG-{random.randint(1000,9999)}" if triage_data["triage_level"] == "critical" else f"APL-{random.randint(1000,9999)}"
    
    tts_result = await tts_task
    print(f"[Pipeline] TTS: {round(time.time()-t0, 2)}s")
    
    total = round(time.time() - pipeline_start, 2)
    print(f"[Pipeline] TOTAL: {total}s")
    
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
    print("Start the server with: uvicorn main:app --reload")
