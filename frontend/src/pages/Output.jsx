import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, X, Loader, ChevronLeft, ChevronRight, RotateCcw, Volume2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import * as api from '../services/api';

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

  // Flashcard states
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState(null);

  // Concept cards view state
  const [showConceptCards, setShowConceptCards] = useState(false);

  useEffect(() => {
    if (topics.length > 0 && !isProcessing) {
      simplifyAllTopics();
    }
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
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

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
          error: null
        });
        
        setSimplificationProgress(Math.round(((index + 1) / totalTopics) * 100));
        
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message;
        
        setSimplificationErrors(prev => ({
          ...prev,
          [index]: errorMsg
        }));
        
        results.push({
          ...topic,
          originalContent: topic.content,
          simplified: false,
          error: errorMsg
        });
        
        setSimplificationProgress(Math.round(((index + 1) / totalTopics) * 100));
      }
      
      setSimplifiedTopics([...results]);
      
      if (index < topics.length - 1) {
        await delay(2000);
      }
    }
    
    setIsSimplifying(false);
    
    // If Hindi is selected, translate all topics
    if (selectedLanguage === "hindi") {
      await translateAllTopics(results);
    } else {
      setIsProcessing(false);
      if (results.length > 0) {
        setSelectedTopic(results[0]);
      }
    }
  };

  // Translation function
  const translateAllTopics = async (topicsToTranslate) => {
    setIsTranslating(true);
    setTranslationProgress(0);
    
    const totalTopics = topicsToTranslate.length;
    const translatedResults = [];
    
    for (let index = 0; index < topicsToTranslate.length; index++) {
      const topic = topicsToTranslate[index];
      
      try {
        // Translate topic name
        const topicResponse = await api.translateText(topic.topic);
        const topicHindi = topicResponse.data.data.translated_text;
        
        // Translate content
        const contentResponse = await api.translateText(topic.content);
        const contentHindi = contentResponse.data.data.translated_text;
        
        translatedResults.push({
          ...topic,
          topic_hindi: topicHindi,
          content_hindi: contentHindi,
          translated: true
        });
        
        setTranslationProgress(Math.round(((index + 1) / totalTopics) * 100));
        
      } catch (err) {
        translatedResults.push({
          ...topic,
          topic_hindi: topic.topic,
          content_hindi: topic.content,
          translated: false,
          translation_error: err.message
        });
        
        setTranslationProgress(Math.round(((index + 1) / totalTopics) * 100));
      }
      
      setSimplifiedTopics([...translatedResults]);
      
      if (index < topicsToTranslate.length - 1) {
        await delay(1500); // Delay between translations
      }
    }
    
    setIsTranslating(false);
    setIsProcessing(false);
    
    if (translatedResults.length > 0) {
      setSelectedTopic(translatedResults[0]);
    }
  };

  // Audio generation function
  const handleGenerateAudio = async () => {
    if (!selectedTopic) return;
    
    setIsGeneratingAudio(true);
    setAudioError(null);
    setAudioLoaded(false);
    
    try {
      // Determine which text to use based on language
      const textToSpeak = selectedLanguage === "hindi" && selectedTopic.content_hindi
        ? selectedTopic.content_hindi
        : selectedTopic.content;
      
      const response = await api.generateAudio(textToSpeak, selectedLanguage);
      
      // Create a blob URL and set it to audio element
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setAudioLoaded(true);
        // Auto-play after loading
        audioRef.current.play();
        setIsPlaying(true);
      }
      
    } catch (err) {
      setAudioError(err.response?.data?.message || err.message || 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Audio control functions
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
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
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, currentTime + 10);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        error: null
      };
      
      setSimplifiedTopics(updatedTopics);
      
      setSimplificationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[topicIndex];
        return newErrors;
      });
      
      if (selectedTopic === topic) {
        setSelectedTopic(updatedTopics[topicIndex]);
      }
    } catch (err) {
      setSimplificationErrors(prev => ({
        ...prev,
        [topicIndex]: err.response?.data?.message || err.message
      }));
    }
  };

  const handleTopicClick = (topic) => {
    const topicIndex = topics.findIndex(t => t.topic === topic.topic);
    if (topicIndex !== -1 && simplifiedTopics[topicIndex]) {
      setSelectedTopic(simplifiedTopics[topicIndex]);
    } else {
      setSelectedTopic(topic);
    }
  };

  const generateMindmap = async () => {
    if (!selectedTopic) return;
    
    setIsGeneratingMindmap(true);
    setMindmapError(null);
    setShowMindmap(true);
    
    try {
      // Use Hindi content if available, otherwise English
      const contentForMindmap = selectedLanguage === "hindi" && selectedTopic.content_hindi
        ? selectedTopic.content_hindi
        : selectedTopic.content;
      
      const response = await api.generateMindmap({
        text: contentForMindmap
      });
      
      setMindmapData(response.data.data);
    } catch (err) {
      setMindmapError(err.response?.data?.message || err.message || 'Failed to generate mindmap');
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

  const generateFlashcards = async () => {
    if (!selectedTopic) return;
    
    setIsGeneratingFlashcards(true);
    setFlashcardsError(null);
    setShowFlashcards(true);
    
    try {
      // Use Hindi content if available, otherwise English
      const contentForFlashcards = selectedLanguage === "hindi" && selectedTopic.content_hindi
        ? selectedTopic.content_hindi
        : selectedTopic.content;
      
      const response = await api.generateFlashcards({
        text: contentForFlashcards
      });
      
      let flashcards = response.data.data;
      if (flashcards.flashcards) {
        flashcards = flashcards.flashcards;
      }
      
      setFlashcardsData(flashcards);
    } catch (err) {
      setFlashcardsError(err.response?.data?.message || err.message || 'Failed to generate flashcards');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const closeFlashcards = () => {
    setShowFlashcards(false);
    setFlashcardsData(null);
    setFlashcardsError(null);
  };

  if (!topics || topics.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400 mb-4">No content available</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
                title="Go back"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📚</span>
              Learning Dashboard
              {/* Language indicator */}
              <span className="text-sm bg-blue-600 px-3 py-1 rounded-full">
                {selectedLanguage === "hindi" ? "हिंदी" : "English"}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
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
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    {/* Show both English and Hindi topic names */}
                    <span className="font-medium text-sm leading-tight block">
                      {topic.topic || `Topic ${index + 1}`}
                    </span>
                    {selectedLanguage === "hindi" && displayTopic.topic_hindi && (
                      <span className="text-xs text-gray-300 mt-1 block opacity-80">
                        {displayTopic.topic_hindi}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

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
                  <p className="text-gray-400 text-sm mt-3 text-center">
                    {isSimplifying
                      ? `${Math.round((simplificationProgress / 100) * topics.length)} of ${topics.length} topics completed`
                      : `${Math.round((translationProgress / 100) * topics.length)} of ${topics.length} topics translated`}
                    <br />
                    <span className="text-xs text-gray-500">
                      {isSimplifying ? "Processing one topic every 2 seconds..." : "Please wait..."}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-blue-500" />
                  <span>Processing...</span>
                </div>
              </div>
            ) : selectedTopic ? (
              <div className="bg-gray-750 rounded-lg p-6 shadow-inner">
                {/* Topic header with both languages */}
                <div className="mb-4 border-b border-gray-600 pb-3">
                  <h2 className="text-2xl font-bold text-blue-300">
                    {selectedTopic.topic}
                  </h2>
                  {selectedLanguage === "hindi" && selectedTopic.topic_hindi && (
                    <h3 className="text-xl font-semibold text-blue-200 mt-2">
                      {selectedTopic.topic_hindi}
                    </h3>
                  )}
                </div>
                
                {selectedTopic.error ? (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                    <p className="text-red-300 mb-3">
                      Error simplifying this topic: {selectedTopic.error}
                    </p>
                    <button
                      onClick={() => {
                        const topicIndex = simplifiedTopics.findIndex(t => t.topic === selectedTopic.topic);
                        if (topicIndex !== -1) retrySimplification(topicIndex);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <RefreshCw size={16} />
                      Retry Simplification
                    </button>
                    {selectedTopic.originalContent && (
                      <div className="mt-4 pt-4 border-t border-red-500/30">
                        <p className="text-gray-400 text-sm mb-2">Showing original content:</p>
                        <div className="prose prose-invert max-w-none">
                          <p className="text-gray-200 leading-relaxed text-base whitespace-pre-wrap">
                            {selectedTopic.originalContent}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="prose prose-invert max-w-none mb-6">
                      <p className="text-gray-200 leading-relaxed text-base whitespace-pre-wrap">
                        {/* Display Hindi content if available, otherwise English */}
                        {selectedLanguage === "hindi" && selectedTopic.content_hindi
                          ? selectedTopic.content_hindi
                          : selectedTopic.content}
                      </p>
                    </div>

                    {/* Audio Player Section */}
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
                              isGeneratingAudio
                                ? 'bg-blue-600/50 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
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
                            {/* Progress Bar */}
                            <div className="relative">
                              <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                style={{
                                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
                                }}
                              />
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4">
                              <button
                                onClick={skipBackward}
                                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-all active:scale-95"
                                title="Skip back 10s"
                              >
                                <SkipBack size={20} className="text-white" />
                              </button>

                              <button
                                onClick={togglePlayPause}
                                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-all active:scale-95 shadow-lg"
                                title={isPlaying ? 'Pause' : 'Play'}
                              >
                                {isPlaying ? (
                                  <Pause size={24} className="text-white" fill="white" />
                                ) : (
                                  <Play size={24} className="text-white ml-1" fill="white" />
                                )}
                              </button>

                              <button
                                onClick={skipForward}
                                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-all active:scale-95"
                                title="Skip forward 10s"
                              >
                                <SkipForward size={20} className="text-white" />
                              </button>
                            </div>

                            {/* Regenerate Button */}
                            <button
                              onClick={handleGenerateAudio}
                              disabled={isGeneratingAudio}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                            >
                              <RefreshCw size={16} />
                              Regenerate Audio
                            </button>
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

          <aside className="w-full lg:w-1/4 bg-gray-800 rounded-xl shadow-md p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-green-400 border-b border-gray-700 pb-2">
              Studio
            </h2>
            <div className="space-y-3">
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <span className="text-2xl">🎵</span>
                <span className="font-medium">Audio Overview</span>
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <span className="text-2xl">🎥</span>
                <span className="font-medium">Video Overview</span>
              </button>
              <button
                onClick={generateMindmap}
                disabled={!selectedTopic || isSimplifying || isTranslating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  selectedTopic && !isSimplifying && !isTranslating
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title={selectedTopic ? 'Generate Mind Map' : 'Select a topic first'}
              >
                <span className="text-2xl">🗺️</span>
                <span className="font-medium">Mind Map</span>
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <span className="text-2xl">📊</span>
                <span className="font-medium">Reports</span>
              </button>
              <button
                onClick={generateFlashcards}
                disabled={!selectedTopic || isSimplifying || isTranslating}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  selectedTopic && !isSimplifying && !isTranslating
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                title={selectedTopic ? 'Generate Flashcards' : 'Select a topic first'}
              >
                <span className="text-2xl">🗂️</span>
                <span className="font-medium">Flashcards</span>
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
                title="Coming soon"
              >
                <span className="text-2xl">❓</span>
                <span className="font-medium">Quiz</span>
              </button>
            </div>
            <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm text-center">
                Additional tools coming soon!
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Mindmap Modal with Tabs */}
      {showMindmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Mind Map: {selectedTopic?.topic}
              </h3>
              <button
                onClick={closeMindmap}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
                title="Close"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            {!isGeneratingMindmap && !mindmapError && mindmapData && (
              <div className="flex gap-2 px-4 pt-4 border-b border-gray-700">
                <button
                  onClick={() => setShowConceptCards(false)}
                  className={`px-4 py-2 rounded-t-lg transition ${
                    !showConceptCards
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  Mind Map View
                </button>
                <button
                  onClick={() => setShowConceptCards(true)}
                  className={`px-4 py-2 rounded-t-lg transition ${
                    showConceptCards
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  📚 Concept Cards
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              {isGeneratingMindmap ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader size={48} className="animate-spin text-purple-500" />
                  <p className="text-gray-300 text-lg">Generating your mind map...</p>
                  <p className="text-gray-500 text-sm">This may take a few moments</p>
                </div>
              ) : mindmapError ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
                    <p className="text-red-300 text-center mb-4">
                      Failed to generate mind map: {mindmapError}
                    </p>
                    <button
                      onClick={generateMindmap}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <RefreshCw size={16} />
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

// Concept Cards View Component
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
        const color = node.color || '#4299e1';
        const emoji = node.emoji || '📌';
        const text = node.text || 'N/A';
        const description = node.description || 'No description available';

        return (
          <div
            key={idx}
            className="concept-card rounded-2xl p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${color}ee, ${color})`,
              color: 'white'
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

// Flashcard Modal Component with gradient colors
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
        .perspective-container {
          perspective: 1000px;
        }

        .flashcard-3d {
          position: relative;
          width: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .flashcard-3d.flipped {
          transform: rotateY(180deg);
        }

        .flashcard-face {
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flashcard-front {
          position: relative;
        }

        .flashcard-back {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

// Mindmap Renderer Component with dark background and tooltip
const MindmapRenderer = ({ data }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!data || !window.go) return;

    const $ = window.go.GraphObject.make;

    const diagram = $(window.go.Diagram, 'mindmap-canvas', {
      layout: $(window.go.TreeLayout, {
        angle: 0,
        layerSpacing: 80,
        nodeSpacing: 40,
        arrangement: window.go.TreeLayout.ArrangementHorizontal
      }),
      'undoManager.isEnabled': true,
      initialAutoScale: window.go.Diagram.Uniform,
      contentAlignment: window.go.Spot.Center,
      padding: 30
    });

    diagram.nodeTemplate = $(
      window.go.Node,
      'Auto',
      {
        selectionAdorned: true,
        shadowVisible: true,
        shadowColor: '#00000055',
        shadowOffset: new window.go.Point(0, 4),
        shadowBlur: 12,
        mouseEnter: (e, node) => {
          const data = node.data;
          if (data && data.description) {
            const docPoint = e.diagram.lastInput.documentPoint;
            const viewPoint = e.diagram.transformDocToView(docPoint);
            setTooltipPos({ 
              x: viewPoint.x + 20, 
              y: viewPoint.y - 10 
            });
            setHoveredNode(data);
          }
        },
        mouseLeave: (e, node) => {
          setHoveredNode(null);
        }
      },
      $(
        window.go.Shape,
        'RoundedRectangle',
        {
          strokeWidth: 2,
          stroke: '#4b5563',
          fill: 'lightblue',
          portId: '',
          cursor: 'pointer'
        },
        new window.go.Binding('fill', 'color'),
        new window.go.Binding('stroke', 'color', (color) => {
          if (!color) return '#4b5563';
          const hex = color.replace('#', '');
          const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
          const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
          const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        })
      ),
      $(
        window.go.Panel,
        'Horizontal',
        { margin: 14 },
        $(
          window.go.TextBlock,
          {
            font: 'bold 22px sans-serif',
            margin: new window.go.Margin(0, 10, 0, 0),
            stroke: 'white'
          },
          new window.go.Binding('text', 'emoji')
        ),
        $(
          window.go.TextBlock,
          {
            font: 'bold 15px sans-serif',
            stroke: 'white',
            maxSize: new window.go.Size(200, NaN),
            wrap: window.go.TextBlock.WrapFit,
            textAlign: 'center'
          },
          new window.go.Binding('text', 'text')
        )
      )
    );

    diagram.linkTemplate = $(
      window.go.Link,
      {
        routing: window.go.Link.Orthogonal,
        corner: 12,
        curve: window.go.Link.JumpOver
      },
      $(window.go.Shape, { strokeWidth: 3, stroke: '#6b7280' })
    );

    diagram.model = new window.go.GraphLinksModel(
      data.nodes || [],
      data.links || []
    );

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
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="bg-gray-900 border-2 border-blue-500 rounded-lg shadow-2xl p-3 max-w-xs">
            <p className="text-white text-sm leading-relaxed">
              {hoveredNode.description}
            </p>
          </div>
          <div className="absolute left-4 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-500" />
        </div>
      )}
    </div>
  );
};

export default Output;