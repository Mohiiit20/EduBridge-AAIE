from flask import Blueprint, request
from utils.response_formatter import success_response, error_response
from services.chatbot_service import chat_with_bot

chatbot_bp = Blueprint("chatbot_bp", __name__)


@chatbot_bp.route("/chat", methods=["POST"])
def chat_route():
    data = request.get_json()

    topic = data.get("topic", "")
    topic_content = data.get("topic_content", "")
    conversation_history = data.get("conversation_history", [])  # list of {role, content}
    user_message = data.get("message", "").strip()

    if not user_message:
        return error_response("No message provided", 400)

    if not topic_content:
        return error_response("No topic content provided", 400)

    try:
        reply = chat_with_bot(topic, topic_content, conversation_history, user_message)
        return success_response({"reply": reply})
    except Exception as e:
        return error_response(str(e))