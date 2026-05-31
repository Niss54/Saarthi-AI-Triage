"""
Sarvam AI Speech-to-Text Helper
Converts audio to text using Sarvam's saaras:v1 model.
Supports Hindi, English, and 8+ Indian languages with auto-detection.
"""
import httpx
import os
import io
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text"

SUPPORTED_LANGUAGES = {
    "hi-IN": "Hindi",
    "en-IN": "English",
    "bn-IN": "Bengali",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "pa-IN": "Punjabi",
}


async def transcribe_audio(
    audio_bytes: bytes,
    language_code: str = "hi-IN",
    auto_detect: bool = False,
    filename: str = "audio.wav"
) -> dict:
    """
    Send audio bytes to Sarvam STT and get transcript.
    
    Args:
        audio_bytes: Raw audio data (WAV/WebM)
        language_code: Language code like 'hi-IN', 'en-IN'
        auto_detect: If True, let Sarvam auto-detect language
        filename: Name of the audio file for multipart upload
    
    Returns:
        dict with 'transcript' and 'language_code'
    """
    if not SARVAM_API_KEY:
        return {"transcript": "", "language_code": language_code, "error": "SARVAM_API_KEY not set"}
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
    }
    
    form_data = {
        "model": "saaras:v3",
        "with_timestamps": "false",
    }
    
    if not auto_detect and language_code:
        form_data["language_code"] = language_code
    
    files = {
        "file": ("audio.wav", io.BytesIO(audio_bytes), "audio/wav"),
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                STT_ENDPOINT,
                headers=headers,
                data=form_data,
                files=files,
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"Sarvam STT success: {result}")
                return {
                    "transcript": result.get("transcript", ""),
                    "language_code": result.get("language_code", language_code),
                }
            else:
                print(f"Sarvam STT error: {response.status_code} — {response.text}")
                return {
                    "transcript": "",
                    "language_code": language_code,
                    "error": f"STT API returned {response.status_code}",
                }
    except Exception as e:
        print(f"Sarvam STT exception: {e}")
        return {
            "transcript": "",
            "language_code": language_code,
            "error": str(e),
        }
