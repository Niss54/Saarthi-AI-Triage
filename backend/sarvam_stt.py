"""
Sarvam AI Speech-to-Text Helper
Converts audio to text using Sarvam's saaras:v3 model.
Supports Hindi, English, and 8+ Indian languages with auto-detection.
"""
import httpx
import os
import io
import subprocess
import tempfile
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


def convert_webm_to_wav(audio_bytes: bytes) -> bytes:
    """Convert WebM/Opus audio to WAV using ffmpeg if available, otherwise return as-is."""
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name
        
        tmp_out_path = tmp_in_path.replace(".webm", ".wav")
        
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in_path, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_out_path],
            capture_output=True, timeout=15
        )
        
        if result.returncode == 0 and os.path.exists(tmp_out_path):
            with open(tmp_out_path, "rb") as f:
                wav_bytes = f.read()
            # Cleanup
            try:
                os.unlink(tmp_in_path)
                os.unlink(tmp_out_path)
            except:
                pass
            print(f"Converted WebM to WAV: {len(audio_bytes)} -> {len(wav_bytes)} bytes")
            return wav_bytes
        else:
            print(f"ffmpeg conversion failed: {result.stderr.decode()[:200]}")
            try:
                os.unlink(tmp_in_path)
            except:
                pass
            return audio_bytes
    except FileNotFoundError:
        print("ffmpeg not found, sending audio as-is (WebM). Install ffmpeg for better STT accuracy.")
        return audio_bytes
    except Exception as e:
        print(f"Audio conversion error: {e}")
        return audio_bytes


async def transcribe_audio(
    audio_bytes: bytes,
    language_code: str = "hi-IN",
    auto_detect: bool = False,
    filename: str = "audio.wav"
) -> dict:
    """
    Send audio bytes to Sarvam STT and get transcript.
    Automatically handles WebM -> WAV conversion.
    """
    if not SARVAM_API_KEY:
        print("SARVAM_API_KEY not set!")
        return {"transcript": "", "language_code": language_code, "error": "SARVAM_API_KEY not set"}
    
    # Detect format and convert if needed
    is_webm = audio_bytes[:4] == b'\x1a\x45\xdf\xa3' or b'webm' in audio_bytes[:40]
    
    if is_webm:
        audio_bytes = convert_webm_to_wav(audio_bytes)
        content_type = "audio/wav"
        upload_filename = "audio.wav"
    else:
        # Check if it's already WAV
        if audio_bytes[:4] == b'RIFF':
            content_type = "audio/wav"
            upload_filename = "audio.wav"
        else:
            content_type = "audio/wav"
            upload_filename = "audio.wav"
    
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
        "file": (upload_filename, io.BytesIO(audio_bytes), content_type),
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
                transcript = result.get("transcript", "")
                print(f"Sarvam STT success: '{transcript[:80]}...' lang={result.get('language_code', language_code)}")
                return {
                    "transcript": transcript,
                    "language_code": result.get("language_code", language_code),
                }
            else:
                error_text = response.text[:300]
                print(f"Sarvam STT error: {response.status_code} — {error_text}")
                return {
                    "transcript": "",
                    "language_code": language_code,
                    "error": f"STT API returned {response.status_code}: {error_text}",
                }
    except Exception as e:
        print(f"Sarvam STT exception: {e}")
        return {
            "transcript": "",
            "language_code": language_code,
            "error": str(e),
        }
