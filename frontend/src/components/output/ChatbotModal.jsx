import { useState, useRef, useEffect } from "react";
import { X, Send, Loader, Bot, User, RotateCcw } from "lucide-react";
import * as api from "../../services/api";

const ChatbotModal = ({ selectedTopic, selectedLanguage, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hey there! 👋 I'm your personal doubt-solver for **"${selectedTopic?.topic}"**.\n\nAsk me anything about this topic and I'll explain it in the simplest way possible — with examples! 😊`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getTopicContent = () => {
    if (selectedLanguage === "hindi" && selectedTopic?.content_hindi) {
      return selectedTopic.content_hindi;
    }
    return selectedTopic?.content || "";
  };

  // Build history excluding the initial greeting
  const getConversationHistory = () => {
    return messages.slice(1).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.chatWithBot({
        topic: selectedTopic?.topic || "",
        topic_content: getTopicContent(),
        conversation_history: getConversationHistory(),
        message: trimmed,
      });

      const assistantMsg = {
        role: "assistant",
        content: res.data.data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: `Hey there! 👋 I'm your personal doubt-solver for **"${selectedTopic?.topic}"**.\n\nAsk me anything about this topic and I'll explain it in the simplest way possible — with examples! 😊`,
      },
    ]);
    setInput("");
    setError(null);
  };

  // Simple markdown-like renderer for bold (**text**) and newlines
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split("\n").map((line, j) => (
        <span key={`${i}-${j}`}>
          {line}
          {j < part.split("\n").length - 1 && <br />}
        </span>
      ));
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl"
           style={{ height: "85vh", maxHeight: "700px" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Doubt Solver</h2>
              <p className="text-gray-400 text-xs truncate max-w-xs">{selectedTopic?.topic}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Clear chat"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm
                ${msg.role === "user"
                  ? "bg-blue-600"
                  : "bg-gradient-to-br from-purple-500 to-blue-600"}`}>
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-sm"}`}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Loading bubble */}
          {isLoading && (
            <div className="flex gap-3 flex-row">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader size={14} className="animate-spin text-blue-400" />
                <span className="text-gray-400 text-sm">Thinking...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts (shown only at start) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {[
              "Can you explain this more simply?",
              "Give me a real-life example",
              "What's the most important point?",
              "Why is this important?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-full transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800 rounded-b-2xl">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your doubt here... (Enter to send)"
              rows={1}
              className="flex-1 bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500 transition"
              style={{ maxHeight: "100px", overflowY: "auto" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-2.5 rounded-xl transition flex-shrink-0 ${
                input.trim() && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotModal;