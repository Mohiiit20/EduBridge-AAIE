from flask import Flask
from flask_cors import CORS
from routes.text_routes import text_bp
from routes.pdf_routes import pdf_bp
from routes.simplify_routes import simplify_bp
from routes.flashcard_routes import flashcard_bp
from routes.mindmap_routes import mindmap_bp
from routes.translation_routes import translation_bp
from routes.audio_routes import audio_bp
from routes.export_routes import export_bp
from routes.quiz_routes import quiz_bp
from routes.image_routes import image_bp
from routes.mcq_routes import mcq_bp
from routes.mindmap_explain_routes import mindmap_explain_bp
from routes.insights_routes import insights_bp
from routes.chatbot_routes import chatbot_bp
from routes.feedback_routes import feedback_bp

import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

CORS(app,
     resources={r"/*": {
         "origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
         "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }})

app.register_blueprint(text_bp)
app.register_blueprint(pdf_bp)
app.register_blueprint(simplify_bp)
app.register_blueprint(flashcard_bp)
app.register_blueprint(mindmap_bp)
app.register_blueprint(translation_bp)
app.register_blueprint(audio_bp)
app.register_blueprint(export_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(image_bp)
app.register_blueprint(mcq_bp)
app.register_blueprint(mindmap_explain_bp)
app.register_blueprint(insights_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(feedback_bp)

os.makedirs("uploads", exist_ok=True)

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="127.0.0.1")
