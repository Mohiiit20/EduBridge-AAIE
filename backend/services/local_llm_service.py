import ollama

def simplify_with_local_llm(text: str) -> str:
    prompt = f"""
You are a study assistant.
Rewrite the following content in simple student-friendly language.
Do not change meaning. Keep it concise.

TEXT:
{text}
"""

    response = ollama.chat(
        model="mistral",
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.2}
    )

    return response["message"]["content"].strip()
