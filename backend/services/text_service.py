import fitz  # PyMuPDF
import json
from openai import OpenAIError
from utils.gemini_client import MODEL

def extract_text_from_pdf(file_stream):
    """Extract raw text from uploaded PDF file"""
    doc = fitz.open(stream=file_stream.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text


def generate_json_dataset(client, text: str):
    """Ask Gemini to structure text into JSON topics + content"""
    messages = [
        {"role": "system", "content": "You are an assistant that extracts structured datasets from textbooks."},
        {"role": "user", "content": (
            "From the following NCERT textbook chapter, extract every sub-topic (with its number/title) "
            "and the content belonging to that sub-topic. "
            "Return the result as a JSON array. Each element must have fields: "
            "\"topic\" (string) and \"content\" (string). "
            "Do not simplify or summarize the content, keep it exactly as it is. "
            "Return only valid JSON, no extra text.\n\n"
            f"Text:\n{text}"
        )}
    ]

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            response_format={"type": "json_object"}
        )
        msg = resp.choices[0].message.content
        dataset = json.loads(msg)
        return dataset

    except (OpenAIError, json.JSONDecodeError) as e:
        return {"error": str(e)}