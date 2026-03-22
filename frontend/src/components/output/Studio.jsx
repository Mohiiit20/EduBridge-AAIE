const BUTTONS = [
  { label: "Mind Map",       emoji: "🗺️", key: "mindmap",  onClick: "onMindmap"   },
  { label: "Flashcards",     emoji: "🗂️", key: "flash",    onClick: "onFlashcards"},
  { label: "Quiz",           emoji: "🎮", key: "quiz",     onClick: "onQuiz"      },
  { label: "Key Insights",   emoji: "💡", key: "insights", onClick: "onInsights"  },
  { label: "Concept Images", emoji: "🖼️", key: "images",   onClick: "onImages"    },
  { label: "Doubt Solver",   emoji: "🤔", key: "doubt",    onClick: "onDoubt"     }, // ✅ added
];

const Studio = ({
  selectedTopic,
  isSimplifying,
  isTranslating,
  onMindmap,
  onFlashcards,
  onQuiz,
  onImages,
  onInsights,
  onDoubt,
}) => {
  const enabled = selectedTopic && !isSimplifying && !isTranslating;

  const handlers = {
    onMindmap,
    onFlashcards,
    onQuiz,
    onImages,
    onInsights,
    onDoubt,
  };

  return (
    <aside
      className="w-full lg:w-1/4 rounded-2xl p-4 max-h-[calc(100vh-140px)] overflow-y-auto"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(17,47,77,0.06)" }}
    >
      <h2
        className="text-sm font-semibold mb-4 pb-2"
        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
      >
        Studio
      </h2>

      <div className="space-y-2">
        {BUTTONS.map(({ label, emoji, key, onClick }) => (
          <button
            key={key}
            onClick={handlers[onClick]} // ✅ now works
            disabled={!enabled}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
            style={
              enabled
                ? { background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)" }
                : { background: "var(--bg-primary)", color: "var(--text-faint)", border: "1px solid var(--border)", cursor: "not-allowed", opacity: 0.5 }
            }
            onMouseEnter={(e) => {
              if (enabled) {
                e.currentTarget.style.background = "var(--tag-fact)";
                e.currentTarget.style.borderColor = "var(--brand-soft)";
                e.currentTarget.style.color = "var(--tag-fact-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (enabled) {
                e.currentTarget.style.background = "var(--bg-primary)";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
          >
            <span style={{ fontSize: "20px" }}>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Studio;