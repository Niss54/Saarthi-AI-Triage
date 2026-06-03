"""
Sarvam AI Text-to-Speech Helper
Converts text to natural Indian-language speech using Sarvam's bulbul:v3 model.
Returns base64-encoded WAV audio.
"""
import httpx
import os
import base64
import time
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech"

# Model configs with compatible speakers
MODEL_CONFIGS = [
    {
        "model": "bulbul:v3",
        "speakers": {
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
    },
    {
        "model": "bulbul:v2",
        "speakers": {
            "hi-IN": "anushka",
            "en-IN": "anushka",
            "bn-IN": "anushka",
            "ta-IN": "anushka",
            "te-IN": "anushka",
            "mr-IN": "abhilash",
            "gu-IN": "anushka",
            "kn-IN": "anushka",
            "ml-IN": "anushka",
            "pa-IN": "anushka",
        }
    },
]


async def text_to_speech(
    text: str,
    language_code: str = "hi-IN",
    pace: float = 1.0,
    sample_rate: int = 22050,
) -> dict:
    """
    Convert text to speech using Sarvam TTS API.
    Uses model-specific speakers for compatibility.
    """
    if not SARVAM_API_KEY:
        print("SARVAM_API_KEY not set!")
        return {"audio_base64": "", "audio_bytes": b"", "error": "SARVAM_API_KEY not set"}
    
    if not text or len(text.strip()) == 0:
        return {"audio_base64": "", "audio_bytes": b"", "error": "Empty text"}
    
    # Truncate very long text (TTS has limits ~500 chars)
    if len(text) > 400:
        text = text[:400]
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    
    last_error = ""
    for config in MODEL_CONFIGS:
        model_name = config["model"]
        speaker = config["speakers"].get(language_code, "ritu")
        
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
            t0 = time.time()
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    TTS_ENDPOINT,
                    headers=headers,
                    json=payload,
                )
                
                elapsed = round(time.time() - t0, 2)
                
                if response.status_code == 200:
                    result = response.json()
                    audios = result.get("audios", [])
                    if audios and len(audios) > 0:
                        audio_b64 = audios[0]
                        audio_bytes = base64.b64decode(audio_b64)
                        print(f"TTS OK [{elapsed}s] model={model_name} speaker={speaker} {len(audio_bytes)}B text='{text[:40]}'")
                        return {
                            "audio_base64": audio_b64,
                            "audio_bytes": audio_bytes,
                        }
                    last_error = "No audio in response"
                else:
                    error_text = response.text[:150]
                    last_error = f"{response.status_code}: {error_text}"
                    print(f"TTS FAIL [{elapsed}s] {model_name}/{speaker}: {last_error}")
                    if response.status_code in [400, 422, 404]:
                        continue
                    break
        except Exception as e:
            last_error = str(e)
            print(f"TTS ERR {model_name}: {e}")
            continue
    
    return {"audio_base64": "", "audio_bytes": b"", "error": last_error}
