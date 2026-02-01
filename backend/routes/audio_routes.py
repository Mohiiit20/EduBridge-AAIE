from flask import Blueprint, request, Response
from utils.response_formatter import error_response
from services.audio_service import generate_audio_stream
import json

audio_bp = Blueprint("audio_bp", __name__)

@audio_bp.route("/generate_audio", methods=["POST"])
def generate_audio_route():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "english")
    
    if not text:
        return error_response("No text provided", 400)
    
    try:
        audio_stream = generate_audio_stream(text, language)
        
        if audio_stream is None:
            return error_response("Failed to generate audio", 500)
        
        # Stream the audio directly
        return Response(
            audio_stream,
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=audio.mp3",
                "Content-Type": "audio/mpeg"
            }
        )
    except Exception as e:
        return error_response(str(e))