from flask import Blueprint, request, send_file
from io import BytesIO
import base64
import os
from fpdf import FPDF

export_bp = Blueprint("export_bp", __name__)
os.makedirs("uploads", exist_ok=True)


def decode_data_url(data_url: str) -> bytes:
    if not data_url or "base64," not in data_url:
        raise ValueError("Invalid data URL")
    b64 = data_url.split("base64,", 1)[1]
    return base64.b64decode(b64)


def safe_filename(name: str) -> str:
    name = (name or "file").strip().replace(" ", "_")
    cleaned = "".join(ch for ch in name if ch.isalnum() or ch in ("_", "-"))
    return (cleaned[:80] or "file")


class TemplatePDF(FPDF):
    """
    FPDF2 with:
    - Automatic page breaks (prevents weird gaps)
    - Background template on every page (via header)
    """
    def __init__(self, bg_path: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.bg_path = bg_path
        self.set_auto_page_break(auto=True, margin=18)   # ✅ important
        self.set_margins(left=18, top=18, right=18)

    def header(self):
        # Draw template on each page
        if self.bg_path and os.path.exists(self.bg_path):
            self.image(self.bg_path, x=0, y=0, w=210, h=297)
        # No header text here because template likely already has design


def add_main_heading(pdf: TemplatePDF, heading: str):
    pdf.set_text_color(10, 10, 10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_xy(18, 28)
    pdf.multi_cell(w=174, h=8, txt=heading, border=0, align="L")
    pdf.ln(2)


def add_topic_heading(pdf: TemplatePDF, topic: str):
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(w=174, h=7, txt=topic, border=0, align="L")
    pdf.ln(1)


def add_paragraphs(pdf: TemplatePDF, text: str):
    pdf.set_text_color(20, 20, 20)
    pdf.set_font("Helvetica", "", 12)

    # Keep good line spacing
    line_h = 6

    for para in (text or "").split("\n"):
        para = para.strip()
        if not para:
            pdf.ln(3)
            continue

        # multi_cell uses auto page breaks properly ✅
        pdf.multi_cell(w=174, h=line_h, txt=para, border=0, align="L")
        pdf.ln(2)


def add_mindmap_image(pdf: TemplatePDF, image_path: str):
    """
    Places mindmap in a standard area.
    It will naturally push to next page if space not enough.
    """
    if not image_path or not os.path.exists(image_path):
        return

    # If there is not enough space remaining, add a new page
    # so the mindmap doesn't get squeezed.
    current_y = pdf.get_y()
    remaining = 297 - 18 - current_y  # bottom margin is 18

    required = 160  # mindmap block height (tune)
    if remaining < required:
        pdf.add_page()
        # move down a bit for consistency
        pdf.set_y(45)

    # Place mindmap
    x = 18
    y = pdf.get_y() + 3
    w = 174
    pdf.image(image_path, x=x, y=y, w=w)
    pdf.ln(150)


# ─────────────────────────────────────────────
# NOTES PDF (single topic)
# ─────────────────────────────────────────────
@export_bp.route("/export/notes/pdf", methods=["POST"])
def export_notes_pdf():
    data = request.get_json(force=True) or {}
    topic_name = data.get("topic_name", "Untitled Topic")
    content = data.get("content", "")
    template_data_url = data.get("template_data_url")

    if not template_data_url:
        return {"status": "error", "message": "Template missing"}, 400

    try:
        bg_bytes = decode_data_url(template_data_url)
    except Exception as e:
        return {"status": "error", "message": f"Template decode error: {str(e)}"}, 400

    bg_path = "uploads/_pdf_template_bg.png"
    with open(bg_path, "wb") as f:
        f.write(bg_bytes)

    pdf = TemplatePDF(bg_path=bg_path)
    pdf.add_page()

    # Main heading
    add_main_heading(pdf, topic_name)

    # Start content a bit below heading
    pdf.set_xy(18, 48)
    add_paragraphs(pdf, content)

    pdf_bytes = bytes(pdf.output(dest="S"))
    out = BytesIO(pdf_bytes)
    out.seek(0)

    filename = f"{safe_filename(topic_name)}_notes.pdf"
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name=filename)


# ─────────────────────────────────────────────
# MINDMAP PDF (single topic)
# ─────────────────────────────────────────────
@export_bp.route("/export/mindmap/pdf", methods=["POST"])
def export_mindmap_pdf():
    data = request.get_json(force=True) or {}
    topic_name = data.get("topic_name", "Untitled Topic")
    mindmap_image_data_url = data.get("mindmap_image_data_url")
    template_data_url = data.get("template_data_url")

    if not template_data_url:
        return {"status": "error", "message": "Template missing"}, 400
    if not mindmap_image_data_url:
        return {"status": "error", "message": "Mindmap image missing"}, 400

    try:
        bg_bytes = decode_data_url(template_data_url)
        mm_bytes = decode_data_url(mindmap_image_data_url)
    except Exception as e:
        return {"status": "error", "message": f"Decode error: {str(e)}"}, 400

    bg_path = "uploads/_pdf_template_bg.png"
    mm_path = "uploads/_mindmap.png"
    with open(bg_path, "wb") as f:
        f.write(bg_bytes)
    with open(mm_path, "wb") as f:
        f.write(mm_bytes)

    pdf = TemplatePDF(bg_path=bg_path)
    pdf.add_page()

    add_main_heading(pdf, topic_name)
    pdf.set_xy(18, 50)
    add_mindmap_image(pdf, mm_path)

    pdf_bytes = bytes(pdf.output(dest="S"))
    out = BytesIO(pdf_bytes)
    out.seek(0)

    filename = f"{safe_filename(topic_name)}_mindmap.pdf"
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name=filename)


# ─────────────────────────────────────────────
# ✅ NEW: TOPIC COMBINED PDF (notes + mindmap)
# ─────────────────────────────────────────────
@export_bp.route("/export/topic/combined/pdf", methods=["POST"])
def export_topic_combined_pdf():
    data = request.get_json(force=True) or {}
    topic_name = data.get("topic_name", "Untitled Topic")
    content = data.get("content", "")
    mindmap_image_data_url = data.get("mindmap_image_data_url")
    template_data_url = data.get("template_data_url")

    if not template_data_url:
        return {"status": "error", "message": "Template missing"}, 400
    if not mindmap_image_data_url:
        return {"status": "error", "message": "Mindmap image missing"}, 400

    try:
        bg_bytes = decode_data_url(template_data_url)
        mm_bytes = decode_data_url(mindmap_image_data_url)
    except Exception as e:
        return {"status": "error", "message": f"Decode error: {str(e)}"}, 400

    bg_path = "uploads/_pdf_template_bg.png"
    mm_path = "uploads/_mindmap.png"
    with open(bg_path, "wb") as f:
        f.write(bg_bytes)
    with open(mm_path, "wb") as f:
        f.write(mm_bytes)

    pdf = TemplatePDF(bg_path=bg_path)
    pdf.add_page()

    add_main_heading(pdf, topic_name)

    # Notes
    pdf.set_xy(18, 48)
    add_paragraphs(pdf, content)

    # Mindmap below
    add_mindmap_image(pdf, mm_path)

    pdf_bytes = bytes(pdf.output(dest="S"))
    out = BytesIO(pdf_bytes)
    out.seek(0)

    filename = f"{safe_filename(topic_name)}_notes_mindmap.pdf"
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name=filename)


# ─────────────────────────────────────────────
# CHAPTER PDF (notes only)
# ─────────────────────────────────────────────
@export_bp.route("/export/chapter/pdf", methods=["POST"])
def export_chapter_pdf():
    data = request.get_json(force=True) or {}
    chapter_title = data.get("chapter_title", "Chapter Notes")
    topics = data.get("topics", [])
    template_data_url = data.get("template_data_url")

    if not template_data_url:
        return {"status": "error", "message": "Template missing"}, 400
    if not topics or not isinstance(topics, list):
        return {"status": "error", "message": "Topics missing"}, 400

    try:
        bg_bytes = decode_data_url(template_data_url)
    except Exception as e:
        return {"status": "error", "message": f"Template decode error: {str(e)}"}, 400

    bg_path = "uploads/_pdf_template_bg.png"
    with open(bg_path, "wb") as f:
        f.write(bg_bytes)

    pdf = TemplatePDF(bg_path=bg_path)
    pdf.add_page()

    add_main_heading(pdf, chapter_title)

    # Start writing content below heading
    pdf.set_xy(18, 48)

    for idx, t in enumerate(topics):
        topic_name = (t.get("topic") or f"Topic {idx+1}").strip()
        content = t.get("content") or ""

        add_topic_heading(pdf, topic_name)
        add_paragraphs(pdf, content)
        pdf.ln(4)

    pdf_bytes = bytes(pdf.output(dest="S"))
    out = BytesIO(pdf_bytes)
    out.seek(0)

    filename = f"{safe_filename(chapter_title)}.pdf"
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name=filename)


# ─────────────────────────────────────────────
# ✅ NEW: CHAPTER COMBINED PDF (notes + mindmaps)
# topics[] expects:
# { topic, content, mindmap_image_data_url }
# ─────────────────────────────────────────────
@export_bp.route("/export/chapter/combined/pdf", methods=["POST"])
def export_chapter_combined_pdf():
    data = request.get_json(force=True) or {}
    chapter_title = data.get("chapter_title", "Chapter Notes + Mindmaps")
    topics = data.get("topics", [])
    template_data_url = data.get("template_data_url")

    if not template_data_url:
        return {"status": "error", "message": "Template missing"}, 400
    if not topics or not isinstance(topics, list):
        return {"status": "error", "message": "Topics missing"}, 400

    try:
        bg_bytes = decode_data_url(template_data_url)
    except Exception as e:
        return {"status": "error", "message": f"Template decode error: {str(e)}"}, 400

    bg_path = "uploads/_pdf_template_bg.png"
    with open(bg_path, "wb") as f:
        f.write(bg_bytes)

    pdf = TemplatePDF(bg_path=bg_path)
    pdf.add_page()

    add_main_heading(pdf, chapter_title)
    pdf.set_xy(18, 48)

    for idx, t in enumerate(topics):
        topic_name = (t.get("topic") or f"Topic {idx+1}").strip()
        content = t.get("content") or ""
        mm_data_url = t.get("mindmap_image_data_url")

        add_topic_heading(pdf, topic_name)
        add_paragraphs(pdf, content)

        if mm_data_url:
            try:
                mm_bytes = decode_data_url(mm_data_url)
                mm_path = f"uploads/_mindmap_{idx}.png"
                with open(mm_path, "wb") as f:
                    f.write(mm_bytes)
                add_mindmap_image(pdf, mm_path)
            except:
                pdf.set_text_color(180, 0, 0)
                pdf.set_font("Helvetica", "B", 11)
                pdf.multi_cell(174, 6, "[Mindmap could not be added]")
                pdf.set_text_color(20, 20, 20)

        pdf.ln(6)

    pdf_bytes = bytes(pdf.output(dest="S"))
    out = BytesIO(pdf_bytes)
    out.seek(0)

    filename = f"{safe_filename(chapter_title)}.pdf"
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name=filename)
