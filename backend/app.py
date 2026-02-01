from flask import Flask
from flask_cors import CORS
from routes.text_routes import text_bp
from routes.pdf_routes import pdf_bp
from routes.simplify_routes import simplify_bp
from routes.flashcard_routes import flashcard_bp
from routes.mindmap_routes import mindmap_bp
from routes.translation_routes import translation_bp  # NEW
from routes.audio_routes import audio_bp  # NEW
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes from frontend
CORS(app,
     resources={r"/*": {
         "origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
         "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }})

# Register blueprints
app.register_blueprint(text_bp)
app.register_blueprint(pdf_bp)
app.register_blueprint(simplify_bp)
app.register_blueprint(flashcard_bp)
app.register_blueprint(mindmap_bp)
app.register_blueprint(translation_bp)  # NEW
app.register_blueprint(audio_bp)  # NEW

# Ensure uploads folder exists
os.makedirs("uploads", exist_ok=True)

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="127.0.0.1")