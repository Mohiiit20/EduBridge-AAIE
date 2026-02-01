import requests
import os
from dotenv import load_dotenv

load_dotenv()

XI_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

def generate_audio_stream(text: str, language: str = "english"):
    """
    Generate audio using ElevenLabs API and return as stream
    
    Args:
        text: Text to convert to speech
        language: "english" or "hindi"
    
    Returns:
        Audio stream or None if failed
    """
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream"
    
    headers = {
        "Accept": "audio/mpeg",
        "xi-api-key": XI_API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.8,
            "similarity_boost": 0.9,
            "style": 0.2,
            "use_speaker_boost": False
        }
    }
    
    try:
        response = requests.post(tts_url, headers=headers, json=data, stream=True)
        
        if not response.ok:
            print(f"TTS Error: {response.text}")
            return None
        
        # Return the raw content as bytes
        return response.content
        
    except Exception as e:
        print(f"Audio generation error: {e}")
        return None