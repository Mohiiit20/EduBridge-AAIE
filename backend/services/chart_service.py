"""
chart_service.py
Extracts ALL numerical data from raw or simplified textbook text and
generates matplotlib charts automatically. Works on:
  - Explicit Label: value tables
  - Inline tables like "Bicycle | 30 | Motorcycle | 25"
  - Practice set data tables
  - Named number sequences (e.g. "Ramesh: 30, Shobha: 60")
"""

import re
import base64
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

_COLORS = [
    "#4CAEE1", "#2E86C1", "#87CEFA", "#1A9CD8",
    "#5DADE2", "#7FB3D3", "#AED6F1", "#0D6EAB",
]

# ── Parsers ───────────────────────────────────────────────────

def _parse_label_value_blocks(text: str) -> list:
    """
    Match blocks of lines like:
        Bicycle: 30
        Motorcycle: 25
    or
        Ramesh | 30 litres
        Shobha | 60 litres
    """
    lines = text.split("\n")
    tables, label_buf, value_buf, title_buf = [], [], [], None
    prev_heading = None

    row_re = re.compile(
        r"^[-•*]?\s*\*{0,2}"
        r"([A-Za-z][A-Za-z0-9\s\-/()']+?)"
        r"\*{0,2}\s*[:|]\s*"
        r"(\d+(?:\.\d+)?)"
        r"(?:\s*(?:litres?|kg|km|cm|mm|°C|minutes?|hours?|trees?|animals?|students?|customers?|plants?|vehicles?|people|children|units?))?"
        r"\s*$",
        re.IGNORECASE
    )
    heading_re = re.compile(r"^(?:#{1,3}\s*)?([A-Z][A-Za-z0-9\s\-:()]+)$")

    def flush(override_title=None):
        nonlocal title_buf
        if len(label_buf) >= 2:
            tables.append({
                "title":  override_title or title_buf,
                "labels": label_buf[:],
                "values": value_buf[:],
            })
        label_buf.clear(); value_buf.clear()
        title_buf = override_title or None

    for ln in lines:
        s = ln.strip()
        m = row_re.match(s)
        if m:
            label_buf.append(m.group(1).strip())
            value_buf.append(float(m.group(2)))
        else:
            flush()
            h = heading_re.match(s)
            if h and 4 < len(s) < 80 and not s.endswith("."):
                prev_heading = s
                title_buf = s

    flush()
    return tables


def _parse_inline_tables(text: str) -> list:
    """
    Match markdown-style tables:
    | Name | Ramesh | Shobha | Ayub |
    | Litres | 30 | 60 | 40 |

    Or two-row inline tables from NCERT practice sets.
    """
    tables = []
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    i = 0
    while i < len(lines) - 1:
        row1 = lines[i]
        row2 = lines[i + 1] if i + 1 < len(lines) else ""

        # Detect pipe-separated rows
        if row1.count("|") >= 2 and row2.count("|") >= 2:
            parts1 = [p.strip() for p in row1.split("|") if p.strip()]
            parts2 = [p.strip() for p in row2.split("|") if p.strip()]

            # Try to figure out which row is labels and which is numbers
            def all_numeric(parts):
                return all(re.match(r'^\d+(?:\.\d+)?$', p) for p in parts)

            if all_numeric(parts2) and not all_numeric(parts1):
                # row1 = labels, row2 = values
                if len(parts1) == len(parts2) and len(parts1) >= 2:
                    # Skip separator rows like |---|---|
                    if not re.match(r'^[-|:\s]+$', row2):
                        tables.append({
                            "title": None,
                            "labels": parts1,
                            "values": [float(v) for v in parts2],
                        })
                        i += 2
                        continue
            elif all_numeric(parts1) and not all_numeric(parts2):
                if len(parts1) == len(parts2) and len(parts1) >= 2:
                    tables.append({
                        "title": None,
                        "labels": parts2,
                        "values": [float(v) for v in parts1],
                    })
                    i += 2
                    continue
        i += 1

    return tables


def _parse_ncert_practice_tables(text: str) -> list:
    """
    NCERT practice sets often have two-row tables like:
    Name    | Ramesh | Shobha | Ayub  | Julie | Rahul
    Litres  | 30     | 60     | 40    | 50    | 55

    or Animals | Deer | Tiger | Monkey
       Number  | 20   | 4     | 12
    """
    tables = []
    lines = [ln for ln in text.split("\n")]

    for i in range(len(lines) - 1):
        ln1 = lines[i].strip()
        ln2 = lines[i + 1].strip()

        # Split by 2+ spaces or tabs (NCERT text often space-separated)
        parts1 = re.split(r'\s{2,}|\t', ln1)
        parts2 = re.split(r'\s{2,}|\t', ln2)

        parts1 = [p.strip() for p in parts1 if p.strip()]
        parts2 = [p.strip() for p in parts2 if p.strip()]

        if len(parts1) < 3 or len(parts2) < 3:
            continue

        def count_numeric(parts):
            return sum(1 for p in parts if re.match(r'^\d+(?:\.\d+)?$', p))

        nums1 = count_numeric(parts1)
        nums2 = count_numeric(parts2)

        # One row mostly text, other row mostly numbers
        if nums2 >= len(parts2) - 1 and nums1 <= 1:
            # row1 = labels (skip first cell which is the row header)
            labels = parts1[1:] if len(parts1) > len(parts2) else parts1
            values_raw = [p for p in parts2 if re.match(r'^\d+(?:\.\d+)?$', p)]
            if len(labels) == len(values_raw) and len(labels) >= 2:
                tables.append({
                    "title": parts1[0] if len(parts1) > len(parts2) else None,
                    "labels": labels,
                    "values": [float(v) for v in values_raw],
                })

        elif nums1 >= len(parts1) - 1 and nums2 <= 1:
            labels = parts2[1:] if len(parts2) > len(parts1) else parts2
            values_raw = [p for p in parts1 if re.match(r'^\d+(?:\.\d+)?$', p)]
            if len(labels) == len(values_raw) and len(labels) >= 2:
                tables.append({
                    "title": parts2[0] if len(parts2) > len(parts1) else None,
                    "labels": labels,
                    "values": [float(v) for v in values_raw],
                })

    return tables


def extract_all_tables(text: str) -> list:
    """Run all parsers and deduplicate by label sets."""
    all_tables = (
        _parse_label_value_blocks(text) +
        _parse_inline_tables(text) +
        _parse_ncert_practice_tables(text)
    )

    # Deduplicate: skip tables whose label sets are identical to an earlier one
    seen = set()
    unique = []
    for t in all_tables:
        key = frozenset(t["labels"])
        if key not in seen and len(t["labels"]) >= 2:
            seen.add(key)
            unique.append(t)

    return unique


# ── Chart renderers ───────────────────────────────────────────

def _to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def generate_bar_chart(labels: list, values: list,
                        title: str = None,
                        xlabel: str = "Value",
                        ylabel: str = "Items") -> str:
    """Horizontal bar chart — better for long label names."""
    n = len(labels)
    fig_h = max(3.5, n * 0.65 + 1.5)
    fig, ax = plt.subplots(figsize=(8, fig_h))
    fig.patch.set_facecolor("#F1FAFF")
    ax.set_facecolor("#F8FCFF")

    colors = [_COLORS[i % len(_COLORS)] for i in range(n)]
    bars = ax.barh(labels, values, color=colors, edgecolor="white",
                   linewidth=0.8, height=0.58)

    max_val = max(values) if values else 1
    for bar, val in zip(bars, values):
        ax.text(
            bar.get_width() + max_val * 0.02,
            bar.get_y() + bar.get_height() / 2,
            str(int(val)) if val == int(val) else f"{val:.1f}",
            va="center", ha="left", fontsize=9,
            color="#112F4D", fontweight="bold"
        )

    ax.set_xlabel(xlabel, fontsize=10, color="#4A6A85")
    ax.set_ylabel(ylabel, fontsize=10, color="#4A6A85")
    if title:
        ax.set_title(title, fontsize=11, color="#112F4D",
                     fontweight="bold", pad=12)

    ax.tick_params(colors="#4A6A85", labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#D0E9F7")
    ax.spines["bottom"].set_color("#D0E9F7")
    ax.xaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    ax.set_xlim(0, max_val * 1.18)
    plt.tight_layout()
    return _to_b64(fig)


def generate_vertical_bar_chart(labels: list, values: list,
                                  title: str = None) -> str:
    """Vertical bar chart — better for short labels (months, days)."""
    n = len(labels)
    fig, ax = plt.subplots(figsize=(max(6, n * 0.9), 5))
    fig.patch.set_facecolor("#F1FAFF")
    ax.set_facecolor("#F8FCFF")

    colors = [_COLORS[i % len(_COLORS)] for i in range(n)]
    bars = ax.bar(labels, values, color=colors, edgecolor="white",
                  linewidth=0.8, width=0.6)

    max_val = max(values) if values else 1
    for bar, val in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + max_val * 0.02,
            str(int(val)) if val == int(val) else f"{val:.1f}",
            ha="center", va="bottom", fontsize=9,
            color="#112F4D", fontweight="bold"
        )

    if title:
        ax.set_title(title, fontsize=11, color="#112F4D",
                     fontweight="bold", pad=12)

    ax.tick_params(colors="#4A6A85", labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#D0E9F7")
    ax.spines["bottom"].set_color("#D0E9F7")
    ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
    ax.set_ylim(0, max_val * 1.18)
    plt.xticks(rotation=20, ha="right")
    plt.tight_layout()
    return _to_b64(fig)


def _choose_chart_type(labels: list) -> str:
    """Use vertical bars for short labels (<=10 chars avg), horizontal otherwise."""
    avg_len = sum(len(l) for l in labels) / max(len(labels), 1)
    return "vertical" if avg_len <= 10 and len(labels) <= 7 else "horizontal"


# ── Main entry point ──────────────────────────────────────────

def generate_charts_for_content(text: str) -> list:
    """
    Parse all data tables from text (raw or simplified) and generate charts.
    Returns list of {"title", "image_b64", "labels", "values"}
    """
    tables = extract_all_tables(text)
    charts = []

    for t in tables:
        try:
            chart_type = _choose_chart_type(t["labels"])
            if chart_type == "vertical":
                b64 = generate_vertical_bar_chart(t["labels"], t["values"], t["title"])
            else:
                b64 = generate_bar_chart(t["labels"], t["values"], t["title"])

            charts.append({
                "title":     t["title"],
                "labels":    t["labels"],
                "values":    t["values"],
                "image_b64": b64,
            })
        except Exception as e:
            print(f"Chart generation skipped: {e}")

    return charts