from flask import Blueprint, request
from utils.response_formatter import success_response, error_response
from utils.gemini_client import initialize_simplify_client
from services.simplify_service import simplify_text

simplify_bp = Blueprint("simplify_bp", __name__)

@simplify_bp.route("/simplify_text", methods=["POST"])
def simplify_text_route():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return error_response("No text provided", 400)

    client = initialize_simplify_client()
    try:
        simplified_formatted = simplify_text(client, text)
        return success_response(simplified_formatted)
    except Exception as e:
        return error_response(str(e))
