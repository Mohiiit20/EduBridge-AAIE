import { useEffect, useRef, useState } from "react";
import { RefreshCw, Volume2, Loader, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import * as api from "../../services/api";
import MCQ from "./MCQ";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ── KaTeX lazy loader ─────────────────────────────────────────
let katexLoaded = false;
const loadKatex = () => new Promise((resolve) => {
  if (katexLoaded || window.katex) { katexLoaded = true; resolve(); return; }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
  document.head.appendChild(link);
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
  script.onload = () => { katexLoaded = true; resolve(); };
  document.head.appendChild(script);
});

// ── Math rendering helpers ────────────────────────────────────
const CHART_COLORS = ["#4CAEE1","#87CEFA","#1A9CD8","#2E86C1","#5DADE2","#7FB3D3","#2980B9","#AED6F1"];

/**
 * Parse "Label: value" lines from simplified content into chart data.
 * Returns null if no valid table found.
 */
const parseChartData = (text) => {
  const lines = text.split("\n");
  const points = [];
  for (const ln of lines) {
    const m = ln.match(/^[-•]?\s*\*?\*?([A-Za-z][A-Za-z0-9\s\-/]+?)\*?\*?\s*[:|]\s*(\d+(?:\.\d+)?)\s*$/);
    if (m) {
      points.push({ name: m[1].trim(), value: parseFloat(m[2]) });
    }
  }
  return points.length >= 2 ? points : null;
};

/** Render a mini inline bar chart */
const InlineBarChart = ({ data, title }) => (
  <div className="my-5 rounded-2xl p-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
    {title && <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>{title}</p>}
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} angle={-20} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
        <Tooltip
          contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "12px" }}
          labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }}
          itemStyle={{ color: "var(--brand)" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

/**
 * Render text that may contain:
 * - **bold** markdown
 * - Inline math: $...$ or \(...\)
 * - Display math: $$...$$ or \[...\]
 * - Bullet lists
 * - Label: value data tables → bar charts
 */
const MathAwareContent = ({ text, isMath, charts = [] }) => {
  const containerRef = useRef(null);
  const [katexReady, setKatexReady] = useState(!!window.katex);

  useEffect(() => {
    if (isMath && !window.katex) {
      loadKatex().then(() => setKatexReady(true));
    }
  }, [isMath]);

  // Split content into chart-blocks and text-blocks
  const segments = [];
  const resolvedText = resolveChartPlaceholders(text || "", charts);
  const lines = resolvedText.split("\n");
  let textBuffer = [];
  let dataBuffer = [];

  const flushText = () => {
    if (textBuffer.length) { segments.push({ type: "text", content: textBuffer.join("\n") }); textBuffer = []; }
  };
  const flushData = () => {
    if (dataBuffer.length >= 2) { segments.push({ type: "chart", data: [...dataBuffer] }); dataBuffer = []; }
    else { textBuffer.push(...dataBuffer.map(d => `${d.name}: ${d.value}`)); dataBuffer = []; }
  };

  for (const ln of lines) {
    const m = ln.match(/^[-•]?\s*\*?\*?([A-Za-z][A-Za-z0-9\s\-/]+?)\*?\*?\s*[:|]\s*(\d+(?:\.\d+)?)\s*$/);
    if (m && isMath) {
      flushText();
      dataBuffer.push({ name: m[1].trim(), value: parseFloat(m[2]) });
    } else {
      flushData();
      textBuffer.push(ln);
    }
  }
  flushData();
  flushText();

  return (
    <div>
      {segments.map((seg, i) => {
        if (seg.type === "chart") {
          return <InlineBarChart key={i} data={seg.data} />;
        }
        return (
          <TextBlock key={i} content={seg.content} isMath={isMath} katexReady={katexReady} charts={charts} />
        );
      })}
    </div>
  );
};

const TextBlock = ({ content, isMath, katexReady }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isMath || !katexReady || !containerRef.current) return;
    // Render all math spans
    containerRef.current.querySelectorAll(".math-inline, .math-display").forEach(el => {
      const src = el.getAttribute("data-math");
      const display = el.classList.contains("math-display");
      try {
        window.katex.render(src, el, { throwOnError: false, displayMode: display });
      } catch {}
    });
  }, [katexReady, content]);

  const rendered = renderTextToHTML(content, isMath);

  return (
    <div
      ref={containerRef}
      className="text-base leading-relaxed"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

const escapeHtml = (s) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderTextToHTML(text, isMath) {
  const safe = escapeHtml(text || "");
  let html = safe;

  if (isMath) {
    // Display math: $$...$$ or \[...\]
    html = html.replace(/\$\$([^$]+?)\$\$/g, (_, math) =>
      `<span class="math-display" data-math="${math.replace(/"/g, "&quot;")}" style="display:block;margin:12px 0;text-align:center;"></span>`
    );
    html = html.replace(/\\\[(.+?)\\\]/gs, (_, math) =>
      `<span class="math-display" data-math="${math.replace(/"/g, "&quot;")}" style="display:block;margin:12px 0;text-align:center;"></span>`
    );
    // Inline math: $...$ or \(...\)
    html = html.replace(/\$([^$\n]+?)\$/g, (_, math) =>
      `<span class="math-inline" data-math="${math.replace(/"/g, "&quot;")}"></span>`
    );
    html = html.replace(/\\\((.+?)\\\)/g, (_, math) =>
      `<span class="math-inline" data-math="${math.replace(/"/g, "&quot;")}"></span>`
    );
    // Equations on own line (e.g. "Area = length × breadth")
    html = html.replace(
      /^([A-Za-z ]+\s*=\s*.+)$/gm,
      `<div style="font-family:monospace;background:var(--tag-fact);color:var(--tag-fact-text);padding:6px 12px;border-radius:8px;margin:6px 0;display:inline-block;font-size:13px;">$1</div>`
    );
  }

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong style='color:var(--text-primary);font-weight:600;'>$1</strong>");

  // Bullets
  const lines = html.split("\n");
  let out = []; let inUl = false;
  for (const ln of lines) {
    const raw = ln.trim();
    if (raw.startsWith("- ")) {
      if (!inUl) { out.push("<ul style='margin:8px 0;padding-left:20px;'>"); inUl = true; }
      out.push(`<li style='margin-bottom:5px;color:var(--text-primary);line-height:1.7;'>${raw.slice(2)}</li>`);
    } else {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (raw === "") out.push("<div style='height:8px'></div>");
      else out.push(`<p style='margin:0 0 9px 0;line-height:1.75;color:var(--text-primary);'>${ln}</p>`);
    }
  }
  if (inUl) out.push("</ul>");
  return out.join("");
}


// ── Charts Section ────────────────────────────────────────────
const ChartsSection = ({ charts }) => {
  if (!charts || charts.length === 0) return null;
  return (
    <div className="mt-4 space-y-5">
      {charts.map((chart, i) => (
        <div key={i} className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
          {chart.title && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                📊 {chart.title}
              </p>
            </div>
          )}
          <img
            src={`data:image/png;base64,${chart.image_b64}`}
            alt={chart.title || "Chart"}
            className="w-full h-auto"
            style={{ display: "block" }}
          />
        </div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const ContentPanel = ({ charts = [],
  selectedTopic,
  simplifiedTopics,
  selectedLanguage,
  isSimplifying,
  isTranslating,
  simplificationProgress,
  translationProgress,
  onRetrySimplification,
}) => {
  const audioRef = useRef(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError]               = useState(null);
  const [isPlaying, setIsPlaying]                 = useState(false);
  const [currentTime, setCurrentTime]             = useState(0);
  const [duration, setDuration]                   = useState(0);
  const [audioLoaded, setAudioLoaded]             = useState(false);
  const [mcqQuestions, setMcqQuestions]           = useState(null);
  const [mcqLoading, setMcqLoading]               = useState(false);
  const [mcqError, setMcqError]                   = useState(null);

  const isMath = selectedTopic?.content_type === "math" ||
    (selectedTopic?.content && /bar graph|pictogram|x-axis|scale\s*:|equation|formula/i.test(selectedTopic.content));

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDur  = () => setDuration(audio.duration);
    const onEnded    = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDur);
    audio.addEventListener("ended", onEnded);
    return () => { audio.removeEventListener("timeupdate", updateTime); audio.removeEventListener("loadedmetadata", updateDur); audio.removeEventListener("ended", onEnded); };
  }, [audioLoaded]);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); setAudioLoaded(false); setCurrentTime(0); setDuration(0); setAudioError(null); }
    setMcqQuestions(null); setMcqError(null);
  }, [selectedTopic]);

  useEffect(() => {
    if (selectedTopic?.topic && selectedTopic?.content && !selectedTopic?.error && !isSimplifying && !isTranslating) {
      const content = selectedLanguage === "hindi" && selectedTopic.content_hindi ? selectedTopic.content_hindi : selectedTopic.content;
      fetchMCQ(selectedTopic.topic, content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic?.topic, isSimplifying, isTranslating]);

  const fetchMCQ = async (topic, content) => {
    if (!topic || !content) return;
    setMcqLoading(true); setMcqError(null); setMcqQuestions(null);
    try {
      const res = await api.generateMCQ(topic, content);
      setMcqQuestions(res.data.data.questions);
    } catch (err) { setMcqError(err.response?.data?.message || err.message || "Failed to load questions"); }
    finally { setMcqLoading(false); }
  };

  const handleGenerateAudio = async () => {
    if (!selectedTopic) return;
    setIsGeneratingAudio(true); setAudioError(null); setAudioLoaded(false);
    try {
      const textToSpeak = selectedLanguage === "hindi" && selectedTopic.content_hindi ? selectedTopic.content_hindi : selectedTopic.content;
      const response = await api.generateAudio(textToSpeak, selectedLanguage);
      const audioUrl = URL.createObjectURL(new Blob([response.data], { type: "audio/mpeg" }));
      if (audioRef.current) { audioRef.current.src = audioUrl; audioRef.current.load(); setAudioLoaded(true); audioRef.current.play(); setIsPlaying(true); }
    } catch (err) { setAudioError(err.response?.data?.message || err.message || "Failed to generate audio"); }
    finally { setIsGeneratingAudio(false); }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } else { audioRef.current.play(); setIsPlaying(true); }
  };
  const handleSeek = (e) => { const t = parseFloat(e.target.value); if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } };
  const formatTime = (t) => { if (isNaN(t)) return "0:00"; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`; };

  const displayContent = selectedLanguage === "hindi" && selectedTopic?.content_hindi ? selectedTopic.content_hindi : selectedTopic?.content;

  return (
    <section className="flex-1 rounded-2xl p-6 max-h-[calc(100vh-140px)] overflow-y-auto"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(17,47,77,0.06)" }}>
      <audio ref={audioRef} />

      {isSimplifying || isTranslating ? (
        <div className="flex flex-col items-center justify-center h-full space-y-5">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                {isSimplifying ? "Simplifying topics..." : "Translating to Hindi..."}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>
                {isSimplifying ? simplificationProgress : translationProgress}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${isSimplifying ? simplificationProgress : translationProgress}%`, background: "var(--brand)" }} />
            </div>
          </div>
        </div>

      ) : selectedTopic ? (
        <div>
          {/* Header */}
          <div className="mb-5 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{selectedTopic.topic}</h2>
              {selectedLanguage === "hindi" && selectedTopic.topic_hindi && (
                <h3 className="text-lg font-semibold mt-1" style={{ color: "var(--text-muted)" }}>{selectedTopic.topic_hindi}</h3>
              )}
            </div>
            {isMath && (
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                style={{ background: "var(--tag-fact)", color: "var(--tag-fact-text)", border: "1px solid var(--border-strong)" }}>
                📐 Maths
              </span>
            )}
          </div>

          {selectedTopic.error ? (
            <div className="rounded-xl p-4 mb-4" style={{ background: "var(--alert)", border: "1px solid var(--alert-border)" }}>
              <p className="text-sm mb-3" style={{ color: "var(--alert-text)" }}>Error simplifying this topic: {selectedTopic.error}</p>
              <button
                onClick={() => { const idx = simplifiedTopics.findIndex(t => t.topic === selectedTopic.topic); if (idx !== -1) onRetrySimplification(idx); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--alert-border)", color: "white", border: "none", cursor: "pointer" }}>
                <RefreshCw size={14} /> Retry Simplification
              </button>
            </div>
          ) : (
            <>
              {/* Math-aware content renderer */}
              <MathAwareContent text={displayContent} isMath={isMath} charts={charts} />
              <ChartsSection charts={charts} />

              {/* Audio */}
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="rounded-2xl p-5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-strong)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                      <Volume2 size={18} style={{ color: "var(--brand)" }} /> Audio Playback
                    </h3>
                    {audioLoaded && <span className="text-xs" style={{ color: "var(--text-faint)" }}>{formatTime(currentTime)} / {formatTime(duration)}</span>}
                  </div>
                  {audioError && (
                    <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "var(--alert)", border: "1px solid var(--alert-border)", color: "var(--alert-text)" }}>{audioError}</div>
                  )}
                  {!audioLoaded ? (
                    <button onClick={handleGenerateAudio} disabled={isGeneratingAudio}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                      style={{ background: "var(--brand)", color: "white", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => !isGeneratingAudio && (e.currentTarget.style.background = "var(--brand-hover)")}
                      onMouseLeave={e => !isGeneratingAudio && (e.currentTarget.style.background = "var(--brand)")}>
                      {isGeneratingAudio ? <><Loader size={18} className="animate-spin" /> Generating Audio...</> : <><Volume2 size={18} /> Generate Audio</>}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: "var(--brand)" }} />
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }}
                          className="p-2.5 rounded-full" style={{ background: "var(--border)", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>
                          <SkipBack size={18} />
                        </button>
                        <button onClick={togglePlayPause} className="p-3.5 rounded-full"
                          style={{ background: "var(--brand)", border: "none", color: "white", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--brand-hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = "var(--brand)"}>
                          {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} className="ml-0.5" fill="white" />}
                        </button>
                        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }}
                          className="p-2.5 rounded-full" style={{ background: "var(--border)", border: "none", color: "var(--text-primary)", cursor: "pointer" }}>
                          <SkipForward size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <MCQ
                key={selectedTopic?.topic}
                questions={mcqQuestions}
                isLoading={mcqLoading}
                error={mcqError}
                onRetry={() => { const c = selectedLanguage === "hindi" && selectedTopic?.content_hindi ? selectedTopic.content_hindi : selectedTopic?.content; fetchMCQ(selectedTopic?.topic, c); }}
              />
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>Select a topic to view content</p>
        </div>
      )}
    </section>
  );
};

export default ContentPanel;