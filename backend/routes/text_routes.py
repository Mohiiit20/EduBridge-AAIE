from flask import Blueprint, request
from utils.response_formatter import success_response, error_response
from utils.gemini_client import initialize_openai_client
from services.text_service import generate_json_dataset

text_bp = Blueprint("text_bp", __name__)

@text_bp.route("/extract_text", methods=["POST"])
def extract_text():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return error_response("No text provided", 400)

    try:
        client = initialize_openai_client()
        dataset = generate_json_dataset(client, text)

        if "error" in dataset:
            return error_response(dataset["error"])

        return success_response(dataset, "Text structured successfully")
    except Exception as e:
        return error_response(str(e))