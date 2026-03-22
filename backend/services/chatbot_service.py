import os
from mistralai import Mistral

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
MISTRAL_MODEL = "mistral-large-latest"


def get_mistral_client():
    return Mistral(api_key=MISTRAL_API_KEY)


def chat_with_bot(topic: str, topic_content: str, conversation_history: list, user_message: str) -> str:
    """
    Generate a chatbot response using Mistral.

    Args:
        topic: The topic name/title the student is studying
        topic_content: The simplified content of the topic (full context)
        conversation_history: List of previous messages [{"role": "user"/"assistant", "content": "..."}]
        user_message: The student's current doubt/question

    Returns:
        The assistant's reply as a string
    """
    client = get_mistral_client()

    system_prompt = f"""You are a friendly, patient, and encouraging tutor helping a student understand their study material.

The student is currently studying the topic: "{topic}"

Here is the full content they are studying:
---
{topic_content}
---

Your job is to:
1. Answer the student's doubts in an even SIMPLER way than the text above.
2. Always use relatable, real-world examples, analogies, and comparisons that a student would easily understand.
3. Break down complex ideas into small, digestible chunks.
4. Use bullet points or numbered steps when explaining processes.
5. Be warm, encouraging, and supportive — never make the student feel bad for asking.
6. If a question is outside the topic, gently redirect them back to the current material.
7. Keep responses concise but complete — don't overwhelm with too much at once.
8. End with a brief encouraging note or ask if they need further clarification.

Always respond in the same language the student uses (English or Hindi)."""

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history for multi-turn context
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add the current user message
    messages.append({"role": "user", "content": user_message})

    response = client.chat.complete(
        model=MISTRAL_MODEL,
        messages=messages,
        max_tokens=800,
        temperature=0.7,
    )

    return response.choices[0].message.content