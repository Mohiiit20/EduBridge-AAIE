from flask import Blueprint, request
from utils.response_formatter import success_response, error_response
from services.translation_service import translate_text_to_hindi

translation_bp = Blueprint("translation_bp", __name__)

@translation_bp.route("/translate", methods=["POST"])
def translate_route():
    data = request.get_json()
    text = data.get("text", "")
    
    if not text:
        return error_response("No text provided", 400)
    
    try:
        translated_text = translate_text_to_hindi(text)
        return success_response({"translated_text": translated_text}, "Translation successful")
    except Exception as e:
        return error_response(str(e))