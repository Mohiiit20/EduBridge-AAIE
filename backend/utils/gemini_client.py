import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# OpenAI / Gemini config
API_KEY = os.getenv("API_KEY")
BASE_URL = os.getenv("BASE_URL")
MODEL = os.getenv("MODEL")

def initialize_openai_client():
    return OpenAI(api_key=API_KEY, base_url=BASE_URL)