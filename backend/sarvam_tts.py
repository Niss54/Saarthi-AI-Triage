"""
Sarvam AI Text-to-Speech Helper
Converts text to natural Indian-language speech using Sarvam's bulbul:v1 model.
Returns base64-encoded WAV audio.
"""
import httpx
import os
import base64
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech"

# Available speakers (based on error response)
SPEAKERS = {
    "hi-IN": "anushka",    # Female, clear Hindi
    "en-IN": "anushka",
    "bn-IN": "anushka",
    "ta-IN": "anushka",
    "te-IN": "anushka",
    "mr-IN": "abhilash",   # Male
    "gu-IN": "anushka",
    "kn-IN": "anushka",
    "ml-IN": "anushka",
    "pa-IN": "anushka",
}


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
    Convert text to speech using Sarvam TTS API.
    
    Args:
        text: Text to convert to speech
        language_code: Target language code
        speaker: Speaker name (auto-selected if None)
        pace: Speech pace (0.5 to 2.0)
        pitch: Pitch adjustment (-1 to 1)
        loudness: Volume (0.5 to 2.0)
        sample_rate: Audio sample rate
    
    Returns:
        dict with 'audio_base64' (base64 WAV string) and 'audio_bytes'
    """
    if not SARVAM_API_KEY:
        return {"audio_base64": "", "audio_bytes": b"", "error": "SARVAM_API_KEY not set"}
    
    if speaker is None:
        speaker = SPEAKERS.get(language_code, "anushka")
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "speaker": speaker,
        "model": "bulbul:v3",
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
                    return {
                        "audio_base64": audio_b64,
                        "audio_bytes": audio_bytes,
                    }
                return {"audio_base64": "", "audio_bytes": b"", "error": "No audio in response"}
            else:
                print(f"Sarvam TTS error: {response.status_code} — {response.text}")
                return {
                    "audio_base64": "",
                    "audio_bytes": b"",
                    "error": f"TTS API returned {response.status_code}",
                }
    except Exception as e:
        print(f"Sarvam TTS exception: {e}")
        return {
            "audio_base64": "",
            "audio_bytes": b"",
            "error": str(e),
        }
