"""
Sarvam AI Text-to-Speech Helper
Converts text to natural Indian-language speech using Sarvam's bulbul:v2 model.
Returns base64-encoded WAV audio.
"""
import httpx
import os
import base64
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech"

# Available speakers
SPEAKERS = {
    "hi-IN": "ritu",
    "en-IN": "ritu",
    "bn-IN": "ritu",
    "ta-IN": "ritu",
    "te-IN": "ritu",
    "mr-IN": "aditya",
    "gu-IN": "ritu",
    "kn-IN": "ritu",
    "ml-IN": "ritu",
    "pa-IN": "ritu",
}

# Model fallback order
TTS_MODELS = ["bulbul:v3", "bulbul:v2"]


async def text_to_speech(
    text: str,
    language_code: str = "hi-IN",
    speaker: str = None,
    pace: float = 0.9,
    pitch: float = 0,
    loudness: float = 1.5,
    sample_rate: int = 22050,
) -> dict:
    """
    Convert text to speech using Sarvam TTS API with model fallback.
    """
    if not SARVAM_API_KEY:
        print("SARVAM_API_KEY not set!")
        return {"audio_base64": "", "audio_bytes": b"", "error": "SARVAM_API_KEY not set"}
    
    if not text or len(text.strip()) == 0:
        return {"audio_base64": "", "audio_bytes": b"", "error": "Empty text"}
    
    # Truncate very long text (TTS has limits)
    if len(text) > 500:
        text = text[:500] + "..."
    
    if speaker is None:
        speaker = SPEAKERS.get(language_code, "anushka")
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    
    # Try each model version
    last_error = ""
    for model_name in TTS_MODELS:
        payload = {
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "model": model_name,
            "pace": pace,
            "speech_sample_rate": sample_rate,
            "enable_preprocessing": True,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    TTS_ENDPOINT,
                    headers=headers,
                    json=payload,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    audios = result.get("audios", [])
                    if audios and len(audios) > 0:
                        audio_b64 = audios[0]
                        audio_bytes = base64.b64decode(audio_b64)
                        print(f"Sarvam TTS success: model={model_name}, {len(audio_bytes)} bytes audio, text='{text[:50]}...'")
                        return {
                            "audio_base64": audio_b64,
                            "audio_bytes": audio_bytes,
                        }
                    last_error = "No audio in response"
                    print(f"Sarvam TTS: No audio in response for model {model_name}")
                else:
                    error_text = response.text[:200]
                    last_error = f"TTS API returned {response.status_code}: {error_text}"
                    print(f"Sarvam TTS error ({model_name}): {response.status_code} — {error_text}")
                    # If 400/422, try next model
                    if response.status_code in [400, 422, 404]:
                        continue
                    # For other errors, don't retry
                    break
        except Exception as e:
            last_error = str(e)
            print(f"Sarvam TTS exception ({model_name}): {e}")
            continue
    
    return {
        "audio_base64": "",
        "audio_bytes": b"",
        "error": last_error,
    }
