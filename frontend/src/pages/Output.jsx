import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  RefreshCw,
  X,
  Loader,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Volume2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Download,
  FileText,
} from "lucide-react";
import * as api from "../services/api";

// ✅ CHANGE THIS if your template file name is different
import PDF_TEMPLATE from "../assets/Textbook_Template.png";

const Output = ({ extractedData, originalData, onBack, selectedLanguage }) => {
  const topics = Array.isArray(extractedData) ? extractedData : [];

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [simplifiedTopics, setSimplifiedTopics] = useState([]);
  const [simplificationProgress, setSimplificationProgress] = useState(0);
  const [isSimplifying, setIsSimplifying] = useState(true);
  const [simplificationErrors, setSimplificationErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);

  // Audio states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef(null);

  // Mindmap states
  const [showMindmap, setShowMindmap] = useState(false);
  const [mindmapData, setMindmapData] = useState(null);
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false);
  const [mindmapError, setMindmapError] = useState(null);

  // Flashcards states
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState(null);

  // Concept cards view state
  const [showConceptCards, setShowConceptCards] = useState(false);

  // Download states
  const [isDownloadingNotes, setIsDownloadingNotes] = useState(false);
  const [isDownloadingMindmap, setIsDownloadingMindmap] = useState(false);
  const [isDownloadingChapter, setIsDownloadingChapter] = useState(false);

  useEffect(() => {
    if (topics.length > 0 && !isProcessing) {
      simplifyAllTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioLoaded]);

  // Reset audio when topic changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setAudioLoaded(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
    }
  }, [selectedTopic]);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const simplifyAllTopics = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setIsSimplifying(true);
    setSimplificationProgress(0);
    setSimplificationErrors({});

    const totalTopics = topics.length;
    const results = [];

    for (let index = 0; index < topics.length; index++) {
      const topic = topics[index];

      try {
        const response = await api.simplifyText(topic.content);

        results.push({
          ...topic,
          content: response.data.data,
          originalContent: topic.content,
          simplified: true,
          error: null,
        });

        setSimplificationProgress(Math.round(((index + 1) / totalTopics) * 100));
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message;

        setSimplificationErrors((prev) => ({
          ...prev,
          [index]: errorMsg,
        }));

        results.push({
          ...topic,
          originalContent: topic.content,
          simplified: false,
          error: errorMsg,
        });

        setSimplificationProgress(Math.round(((index + 1) / totalTopics) * 100));
      }

      setSimplifiedTopics([...results]);

      if (index < topics.length - 1) {
        await delay(2000);
      }
    }

    setIsSimplifying(false);

    if (selectedLanguage === "hindi") {
      await translateAllTopics(results);
    } else {
      setIsProcessing(false);
      if (results.length > 0) setSelectedTopic(results[0]);
    }
  };

  const translateAllTopics = async (topicsToTranslate) => {
    setIsTranslating(true);
    setTranslationProgress(0);

    const totalTopics = topicsToTranslate.length;
    const translatedResults = [];

    for (let index = 0; index < topicsToTranslate.length; index++) {
      const topic = topicsToTranslate[index];

      try {
        const topicResponse = await api.translateText(topic.topic);
        const topicHindi = topicResponse.data.data.translated_text;

        const contentResponse = await api.translateText(topic.content);
        const contentHindi = contentResponse.data.data.translated_text;

        translatedResults.push({
          ...topic,
          topic_hindi: topicHindi,
          content_hindi: contentHindi,
          translated: true,
        });

        setTranslationProgress(Math.round(((index + 1) / totalTopics) * 100));
      } catch (err) {
        translatedResults.push({
          ...topic,
          topic_hindi: topic.topic,
          content_hindi: topic.content,
          translated: false,
          translation_error: err.message,
        });

        setTranslationProgress(Math.round(((index + 1) / totalTopics) * 100));
      }

      setSimplifiedTopics([...translatedResults]);

      if (index < topicsToTranslate.length - 1) {
        await delay(1500);
      }
    }

    setIsTranslating(false);
    setIsProcessing(false);
    if (translatedResults.length > 0) setSelectedTopic(translatedResults[0]);
  };

  // Audio generation
  const handleGenerateAudio = async () => {
    if (!selectedTopic) return;

    setIsGeneratingAudio(true);
    setAudioError(null);
    setAudioLoaded(false);

    try {
      const textToSpeak =
        selectedLanguage === "hindi" && selectedTopic.content_hindi
          ? selectedTopic.content_hindi
          : selectedTopic.content;

      const response = await api.generateAudio(textToSpeak, selectedLanguage);

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setAudioLoaded(true);
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setAudioError(err.response?.data?.message || err.message || "Failed to generate audio");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10);
  };

  const skipForward = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const retrySimplification = async (topicIndex) => {
    const topic = simplifiedTopics[topicIndex];
    if (!topic || !originalData) return;

    try {
      const response = await api.simplifyText(originalData[topicIndex].content);

      const updatedTopics = [...simplifiedTopics];
      updatedTopics[topicIndex] = {
        ...topic,
        content: response.data.data,
        simplified: true,
        error: null,
      };

      setSimplifiedTopics(updatedTopics);

      setSimplificationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[topicIndex];
        return newErrors;
      });

      if (selectedTopic === topic) setSelectedTopic(updatedTopics[topicIndex]);
    } catch (err) {
      setSimplificationErrors((prev) => ({
        ...prev,
        [topicIndex]: err.response?.data?.message || err.message,
      }));
    }
  };

  const handleTopicClick = (topic) => {
    const topicIndex = topics.findIndex((t) => t.topic === topic.topic);
    if (topicIndex !== -1 && simplifiedTopics[topicIndex]) {
      setSelectedTopic(simplifiedTopics[topicIndex]);
    } else {
      setSelectedTopic(topic);
    }
  };

  // Mindmap generate
  const generateMindmap = async () => {
    if (!selectedTopic) return;

    setIsGeneratingMindmap(true);
    setMindmapError(null);
    setShowMindmap(true);

    try {
      const contentForMindmap =
        selectedLanguage === "hindi" && selectedTopic.content_hindi
          ? selectedTopic.content_hindi
          : selectedTopic.content;

      const response = await api.generateMindmap({ text: contentForMindmap });
      setMindmapData(response.data.data);
      setShowConceptCards(false); // default to mindmap view
    } catch (err) {
      setMindmapError(err.response?.data?.message || err.message || "Failed to generate mindmap");
    } finally {
      setIsGeneratingMindmap(false);
    }
  };

  const closeMindmap = () => {
    setShowMindmap(false);
    setShowConceptCards(false);
    setMindmapData(null);
    setMindmapError(null);
  };

  // Flashcards generate
  const generateFlashcards = async () => {
    if (!selectedTopic) return;

    setIsGeneratingFlashcards(true);
    setFlashcardsError(null);
    setShowFlashcards(true);

    try {
      const contentForFlashcards =
        selectedLanguage === "hindi" && selectedTopic.content_hindi
          ? selectedTopic.content_hindi
          : selectedTopic.content;

      const response = await api.generateFlashcards({ text: contentForFlashcards });

      let flashcards = response.data.data;
      if (flashcards.flashcards) flashcards = flashcards.flashcards;

      setFlashcardsData(flashcards);
    } catch (err) {
      setFlashcardsError(err.response?.data?.message || err.message || "Failed to generate flashcards");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const closeFlashcards = () => {
    setShowFlashcards(false);
    setFlashcardsData(null);
    setFlashcardsError(null);
  };

  // Helpers
  const getTemplateDataUrl = async () => {
    const res = await fetch(PDF_TEMPLATE);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // ✅ Download Notes PDF (single topic)
  const handleDownloadNotesPDF = async () => {
    if (!selectedTopic) return;
    setIsDownloadingNotes(true);

    try {
      const templateDataUrl = await getTemplateDataUrl();
      const contentToExport =
        selectedLanguage === "hindi" && selectedTopic.content_hindi
          ? selectedTopic.content_hindi
          : selectedTopic.content;

      const response = await api.exportNotesPDF(selectedTopic.topic, contentToExport, templateDataUrl);

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      downloadBlob(pdfBlob, `${selectedTopic.topic}_notes.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to download Notes PDF. Check backend logs.");
    } finally {
      setIsDownloadingNotes(false);
    }
  };

  // ✅ FIXED: Download Mindmap PDF (fetch diagram directly from DOM)
  const handleDownloadMindmapPDF = async () => {
    if (!selectedTopic || !mindmapData) return;

    setIsDownloadingMindmap(true);
    try {
      const templateDataUrl = await getTemplateDataUrl();

      // 1) Find the diagram safely
      if (!window.go) {
        alert("GoJS (window.go) not found. Ensure GoJS is loaded.");
        return;
      }

      const div = document.getElementById("mindmap-canvas");
      if (!div) {
        alert("Mindmap canvas not found. Try switching to 'Mind Map View' tab first.");
        return;
      }

      const diagram = window.go.Diagram.fromDiv(div);
      if (!diagram) {
        alert("Mindmap diagram not ready. Click 'Mind Map View' once, then try again.");
        return;
      }

      // 2) Export to image
      const imageDataUrl = diagram.makeImageData({
        background: "white",
        scale: 1,
      });

      if (!imageDataUrl || !imageDataUrl.startsWith("data:image")) {
        alert("Failed to generate mindmap image. Try again.");
        return;
      }

      // 3) Send to backend
      const response = await api.exportMindmapPDF(selectedTopic.topic, imageDataUrl, templateDataUrl);

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      downloadBlob(pdfBlob, `${selectedTopic.topic}_mindmap.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to download Mindmap PDF. Check backend logs.");
    } finally {
      setIsDownloadingMindmap(false);
    }
  };

  // ✅ NEW: Download Entire Chapter PDF
  const handleDownloadChapterPDF = async () => {
    if (!simplifiedTopics || simplifiedTopics.length === 0) return;
    setIsDownloadingChapter(true);

    try {
      const templateDataUrl = await getTemplateDataUrl();

      // Build topics array for backend
      const exportTopics = simplifiedTopics.map((t) => ({
        topic: t.topic,
        content:
          selectedLanguage === "hindi" && t.content_hindi
            ? t.content_hindi
            : t.content,
      }));

      const chapterTitle = "Chapter Notes"; // You can later replace with actual chapter name
      const response = await api.exportChapterPDF(chapterTitle, exportTopics, templateDataUrl);

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      downloadBlob(pdfBlob, `chapter_notes.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to download Chapter PDF. Check backend logs.");
    } finally {
      setIsDownloadingChapter(false);
    }
  };

  if (!topics || topics.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">No content available</p>
          <button onClick={onBack} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <audio ref={audioRef} />

      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-lg transition" title="Go back">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📚</span>
              Learning Dashboard
              <span className="text-sm bg-blue-600 px-3 py-1 rounded-full">
                {selectedLanguage === "hindi" ? "हिंदी" : "English"}
              </span>
            </h1>
          </div>

          {/* ✅ Chapter download button */}
          <button
            onClick={handleDownloadChapterPDF}
            disabled={isDownloadingChapter || isSimplifying || isTranslating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              isDownloadingChapter ? "bg-green-700/50 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            } text-white`}
            title="Download Entire Chapter PDF"
          >
            {isDownloadingChapter ? <Loader size={16} className="animate-spin" /> : <FileText size={16} />}
            Download Chapter
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Topics */}
          <aside className="w-full lg:w-1/4 bg-gray-800 rounded-xl shadow-md p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 border-b border-gray-700 pb-2">
              Topics ({topics.length})
            </h2>

            <nav className="space-y-2">
              {topics.map((topic, index) => {
                const simplifiedTopic = simplifiedTopics[index];
                const displayTopic = simplifiedTopic || topic;

                return (
                  <button
                    key={index}
                    onClick={() => handleTopicClick(topic)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      selectedTopic && selectedTopic.topic === topic.topic
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                    }`}
                  >
                    <span className="font-medium text-sm leading-tight block">{topic.topic || `Topic ${index + 1}`}</span>
                    {selectedLanguage === "hindi" && displayTopic.topic_hindi && (
                      <span className="text-xs text-gray-300 mt-1 block opacity-80">{displayTopic.topic_hindi}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <section className="flex-1 bg-gray-800 rounded-xl shadow-md p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
            {isSimplifying || isTranslating ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="w-full max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">
                      {isSimplifying ? "Simplifying topics..." : "Translating to Hindi..."}
                    </span>
                    <span className="text-blue-400 font-semibold">
                      {isSimplifying ? simplificationProgress : translationProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${isSimplifying ? simplificationProgress : translationProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : selectedTopic ? (
              <div className="bg-gray-750 rounded-lg p-6 shadow-inner">
                <div className="mb-4 border-b border-gray-600 pb-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-300">{selectedTopic.topic}</h2>
                    {selectedLanguage === "hindi" && selectedTopic.topic_hindi && (
                      <h3 className="text-xl font-semibold text-blue-200 mt-2">{selectedTopic.topic_hindi}</h3>
                    )}
                  </div>

                  <button
                    onClick={handleDownloadNotesPDF}
                    disabled={isDownloadingNotes}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isDownloadingNotes ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    } text-white`}
                    title="Download Notes PDF"
                  >
                    {isDownloadingNotes ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                    Download Notes
                  </button>
                </div>

                {selectedTopic.error ? (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                    <p className="text-red-300 mb-3">Error simplifying this topic: {selectedTopic.error}</p>
                    <button
                      onClick={() => {
                        const topicIndex = simplifiedTopics.findIndex((t) => t.topic === selectedTopic.topic);
                        if (topicIndex !== -1) retrySimplification(topicIndex);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <RefreshCw size={16} />
                      Retry Simplification
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert max-w-none mb-6">
                      <p className="text-gray-200 leading-relaxed text-base whitespace-pre-wrap">
                        {selectedLanguage === "hindi" && selectedTopic.content_hindi
                          ? selectedTopic.content_hindi
                          : selectedTopic.content}
                      </p>
                    </div>

                    {/* Audio section kept same */}
                    <div className="mt-8 pt-6 border-t border-gray-700">
                      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Volume2 size={20} className="text-blue-400" />
                            Audio Playback
                          </h3>
                          {audioLoaded && (
                            <span className="text-sm text-gray-400">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                          )}
                        </div>

                        {audioError && (
                          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                            <p className="text-red-300 text-sm">{audioError}</p>
                          </div>
                        )}

                        {!audioLoaded ? (
                          <button
                            onClick={handleGenerateAudio}
                            disabled={isGeneratingAudio}
                            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
                              isGeneratingAudio ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            } text-white`}
                          >
                            {isGeneratingAudio ? (
                              <>
                                <Loader size={20} className="animate-spin" />
                                <span>Generating Audio...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={20} />
                                <span>Generate Audio</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <input
                              type="range"
                              min="0"
                              max={duration || 0}
                              value={currentTime}
                              onChange={handleSeek}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex items-center justify-center gap-4">
                              <button onClick={skipBackward} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full">
                                <SkipBack size={20} className="text-white" />
                              </button>
                              <button onClick={togglePlayPause} className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full">
                                {isPlaying ? <Pause size={24} className="text-white" fill="white" /> : <Play size={24} className="text-white ml-1" fill="white" />}
                              </button>
                              <button onClick={skipForward} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full">
                                <SkipForward size={20} className="text-white" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-lg">Select a topic to view content</p>
              </div>
            )}
          </section>

          {/* Studio */}
          <aside className="w-full lg:w-1/4 bg-gray-800 rounded-xl shadow-md p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-green-400 border-b border-gray-700 pb-2">Studio</h2>

            <div className="space-y-3">
              <button
                onClick={generateMindmap}
                disabled={!selectedTopic || isSimplifying || isTranslating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  selectedTopic && !isSimplifying && !isTranslating
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <span className="text-2xl">🗺️</span>
                <span className="font-medium">Mind Map</span>
              </button>

              <button
                onClick={generateFlashcards}
                disabled={!selectedTopic || isSimplifying || isTranslating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  selectedTopic && !isSimplifying && !isTranslating
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <span className="text-2xl">🗂️</span>
                <span className="font-medium">Flashcards</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mindmap Modal */}
      {showMindmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Mind Map: {selectedTopic?.topic}
              </h3>
              <button onClick={closeMindmap} className="p-2 hover:bg-gray-700 rounded-lg transition" title="Close">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Tabs + Download */}
            {!isGeneratingMindmap && !mindmapError && mindmapData && (
              <div className="flex gap-2 px-4 pt-4 border-b border-gray-700">
                <button
                  onClick={() => setShowConceptCards(false)}
                  className={`px-4 py-2 rounded-t-lg transition ${
                    !showConceptCards ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"
                  }`}
                >
                  Mind Map View
                </button>

                <button
                  onClick={() => setShowConceptCards(true)}
                  className={`px-4 py-2 rounded-t-lg transition ${
                    showConceptCards ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"
                  }`}
                >
                  📚 Concept Cards
                </button>

                <button
                  onClick={handleDownloadMindmapPDF}
                  disabled={isDownloadingMindmap}
                  className={`px-4 py-2 rounded-t-lg transition flex items-center gap-2 ${
                    isDownloadingMindmap ? "bg-purple-700/50 text-white cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {isDownloadingMindmap ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              {isGeneratingMindmap ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader size={48} className="animate-spin text-purple-500" />
                  <p className="text-gray-300 text-lg">Generating your mind map...</p>
                </div>
              ) : mindmapError ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
                    <p className="text-red-300 text-center mb-4">Failed to generate mind map: {mindmapError}</p>
                    <button onClick={generateMindmap} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                      Retry
                    </button>
                  </div>
                </div>
              ) : mindmapData ? (
                showConceptCards ? (
                  <ConceptCardsView nodes={mindmapData.nodes || []} />
                ) : (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 h-full min-h-[600px]">
                    <MindmapRenderer data={mindmapData} />
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Flashcards Modal */}
      {showFlashcards && (
        <FlashcardModal
          flashcards={flashcardsData}
          isLoading={isGeneratingFlashcards}
          error={flashcardsError}
          topicName={selectedTopic?.topic}
          onClose={closeFlashcards}
          onRetry={generateFlashcards}
        />
      )}
    </div>
  );
};

// Concept Cards
const ConceptCardsView = ({ nodes }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No concept cards available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
      {nodes.map((node, idx) => {
        const color = node.color || "#4299e1";
        const emoji = node.emoji || "📌";
        const text = node.text || "N/A";
        const description = node.description || "No description available";

        return (
          <div
            key={idx}
            className="rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${color}ee, ${color})`,
              color: "white",
            }}
          >
            <div className="text-4xl mb-3">{emoji}</div>
            <h3 className="text-xl font-bold mb-2">{text}</h3>
            <p className="text-sm opacity-95 leading-relaxed">{description}</p>
          </div>
        );
      })}
    </div>
  );
};

// Mindmap Renderer
const MindmapRenderer = ({ data }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!data || !window.go) return;

    const $ = window.go.GraphObject.make;

    const diagram = $(window.go.Diagram, "mindmap-canvas", {
      layout: $(window.go.TreeLayout, {
        angle: 0,
        layerSpacing: 80,
        nodeSpacing: 40,
        arrangement: window.go.TreeLayout.ArrangementHorizontal,
      }),
      initialAutoScale: window.go.Diagram.Uniform,
      contentAlignment: window.go.Spot.Center,
      padding: 30,
    });

    diagram.nodeTemplate = $(
      window.go.Node,
      "Auto",
      {
        mouseEnter: (e, node) => {
          const nd = node.data;
          if (nd && nd.description) {
            const docPoint = e.diagram.lastInput.documentPoint;
            const viewPoint = e.diagram.transformDocToView(docPoint);
            setTooltipPos({ x: viewPoint.x + 20, y: viewPoint.y - 10 });
            setHoveredNode(nd);
          }
        },
        mouseLeave: () => setHoveredNode(null),
      },
      $(
        window.go.Shape,
        "RoundedRectangle",
        { strokeWidth: 2, stroke: "#4b5563", fill: "lightblue", cursor: "pointer" },
        new window.go.Binding("fill", "color")
      ),
      $(
        window.go.Panel,
        "Horizontal",
        { margin: 14 },
        $(
          window.go.TextBlock,
          { font: "bold 22px sans-serif", margin: new window.go.Margin(0, 10, 0, 0), stroke: "white" },
          new window.go.Binding("text", "emoji")
        ),
        $(
          window.go.TextBlock,
          { font: "bold 15px sans-serif", stroke: "white", maxSize: new window.go.Size(200, NaN), wrap: window.go.TextBlock.WrapFit, textAlign: "center" },
          new window.go.Binding("text", "text")
        )
      )
    );

    diagram.linkTemplate = $(
      window.go.Link,
      { routing: window.go.Link.Orthogonal, corner: 12, curve: window.go.Link.JumpOver },
      $(window.go.Shape, { strokeWidth: 3, stroke: "#6b7280" })
    );

    diagram.model = new window.go.GraphLinksModel(data.nodes || [], data.links || []);

    return () => {
      diagram.div = null;
    };
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <div id="mindmap-canvas" className="w-full h-full min-h-[550px]" />

      {hoveredNode && hoveredNode.description && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(0, -100%)",
          }}
        >
          <div className="bg-gray-900 border-2 border-blue-500 rounded-lg shadow-2xl p-3 max-w-xs">
            <p className="text-white text-sm leading-relaxed">{hoveredNode.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Flashcard Modal Component
const FlashcardModal = ({ flashcards, isLoading, error, topicName, onClose, onRetry }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cardGradients = [
    'from-purple-600 via-purple-500 to-pink-500',
    'from-blue-600 via-blue-500 to-cyan-500',
    'from-green-600 via-emerald-500 to-teal-500',
    'from-orange-600 via-orange-500 to-yellow-500',
    'from-red-600 via-rose-500 to-pink-500',
    'from-indigo-600 via-purple-500 to-pink-500',
    'from-teal-600 via-cyan-500 to-blue-500',
    'from-amber-600 via-orange-500 to-red-500',
  ];

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader size={48} className="animate-spin text-green-500" />
          <p className="text-gray-300 text-lg">Generating flashcards...</p>
          <p className="text-gray-500 text-sm">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Error</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <p className="text-red-300 text-center mb-4">
              Failed to generate flashcards: {error}
            </p>
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return null;
  }

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;
  const currentGradient = cardGradients[currentIndex % cardGradients.length];

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (!isFlipped) {
        handleFlip();
      } else {
        handleNext();
      }
    } else if (e.key === 'ArrowLeft' || e.key === '-') {
      e.preventDefault();
      handlePrevious();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onKeyDown={handleKeyPress}
      tabIndex={0}
      autoFocus
    >
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{topicName} Flashcards</h2>
            <p className="text-gray-400 text-sm mt-1">Based on 1 source</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition text-white"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="text-center text-gray-400 text-sm mb-4">
          Press 'Space' to flip, '←' / '→' to navigate
        </div>

        <div className="relative perspective-container">
          <div
            className={`flashcard-3d ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            style={{ cursor: 'pointer' }}
          >
            <div className={`flashcard-face flashcard-front bg-gradient-to-br ${currentGradient} rounded-3xl p-12 shadow-2xl border-2 border-white/20 min-h-[400px] flex flex-col items-center justify-center`}>
              <div className="text-center">
                <p className="text-white text-2xl leading-relaxed font-medium drop-shadow-lg">
                  {currentCard.question}
                </p>
                {!isFlipped && (
                  <button className="mt-8 px-6 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-sm transition border border-white/30">
                    See answer
                  </button>
                )}
              </div>
            </div>

            <div className={`flashcard-face flashcard-back bg-gradient-to-br ${currentGradient} rounded-3xl p-12 shadow-2xl border-2 border-white/20 min-h-[400px] flex flex-col items-center justify-center`}>
              <div className="text-center w-full">
                <p className="text-white text-2xl leading-relaxed font-medium drop-shadow-lg">
                  {currentCard.answer}
                </p>
                {currentCard.explanation && (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 mx-auto mt-6 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg text-sm transition border border-white/30"
                  >
                    <RotateCcw size={16} />
                    Explain
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`p-3 rounded-full transition ${
              currentIndex === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-white text-lg font-semibold min-w-[80px] text-center">
            {currentIndex + 1} / {totalCards}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === totalCards - 1}
            className={`p-3 rounded-full transition ${
              currentIndex === totalCards - 1
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <style>{`
        .perspective-container { perspective: 1000px; }
        .flashcard-3d { position: relative; width: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .flashcard-3d.flipped { transform: rotateY(180deg); }
        .flashcard-face { width: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .flashcard-front { position: relative; }
        .flashcard-back { position: absolute; top: 0; left: 0; transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default Output;
