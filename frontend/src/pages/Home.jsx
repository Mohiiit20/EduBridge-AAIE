import React, { useState, useRef } from "react";
import { ArrowRight, Upload, Loader, Globe } from "lucide-react";
import * as api from "../services/api";
import Output from "./Output";

function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [showOutput, setShowOutput] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("english"); // NEW
  const fileRef = useRef(null);

  const handleProcessText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.extractText(text);
      const topics = response.data.data;
      setOriginalData(topics);
      setExtractedData(topics);
      setShowOutput(true);
    } catch (err) {
      setError("Error processing text: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleUploadPDF = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.uploadPDF(file);
      const topics = response.data.data;
      setOriginalData(topics);
      setExtractedData(topics);
      setShowOutput(true);
    } catch (err) {
      setError("Error uploading PDF: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleBack = () => {
    setShowOutput(false);
    setExtractedData(null);
    setOriginalData(null);
    setFile(null);
    setText("");
    setError(null);
    setSelectedLanguage("english");
  };

  const onPickFile = () => fileRef.current?.click();
  const onFileChange = (e) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const isActive = text.trim() !== "" || file !== null;

  if (showOutput && extractedData) {
    return (
      <Output
        extractedData={extractedData}
        originalData={originalData}
        onBack={handleBack}
        selectedLanguage={selectedLanguage} // NEW: Pass language to Output
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 px-6 overflow-hidden">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white text-center mb-3">
        What'd you like to learn today?
      </h1>
      <p className="text-gray-400 text-center mb-12 max-w-2xl">
        Upload a PDF or paste your notes. We'll help you extract, simplify, and understand the content better.
      </p>

      {error && (
        <div className="w-full max-w-3xl mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* NEW: Language Selector */}
      <div className="w-full max-w-3xl mb-4">
        <div className="flex items-center gap-3 bg-stone-900 rounded-xl p-4 border border-stone-700">
          <Globe className="text-sky-400" size={24} />
          <label className="text-white font-medium">Select Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="flex-1 bg-stone-800 text-white px-4 py-2 rounded-lg border border-stone-600 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="english">English</option>
            <option value="hindi">Hindi (हिंदी)</option>
          </select>
        </div>
      </div>

      <div className="relative w-full max-w-3xl mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text or notes here..."
          className="w-full h-24 p-4 pr-14 rounded-xl bg-stone-900 text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 hover:bg-stone-800/80 transition-all duration-300 placeholder-gray-500"
        />
        <button
          onClick={handleProcessText}
          disabled={!text.trim() || loading}
          className="absolute bottom-3 right-3 p-2 rounded-full transition duration-200 z-10"
          style={
            isActive && text.trim()
              ? { backgroundColor: "white" }
              : { backgroundColor: "#0ea5e9" }
          }
        >
          {loading ? (
            <Loader size={20} className="animate-spin" color="#1e1e1e" />
          ) : (
            <ArrowRight size={20} color={isActive && text.trim() ? "#1e1e1e" : "white"} />
          )}
        </button>
      </div>

      <div
        className="w-full max-w-3xl border-2 border-dashed border-stone-700 rounded-xl p-8 hover:border-sky-500 hover:bg-stone-900/50 transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center space-y-3"
        onClick={onPickFile}
      >
        <Upload className="text-sky-400 w-8 h-8" />
        <p className="text-white text-base font-medium">
          {file ? (
            <>
              <span className="text-sky-400">✓ {file.name}</span> ready to upload
            </>
          ) : (
            "Drag and drop your PDF here or click to upload"
          )}
        </p>
        <p className="text-gray-500 text-sm">PDF files only, up to 50MB</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {file && (
        <button
          onClick={handleUploadPDF}
          disabled={loading}
          className="mt-6 px-8 py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg font-medium transition duration-200"
        >
          {loading ? "Processing..." : "Process PDF"}
        </button>
      )}
    </div>
  );
}

export default Home;