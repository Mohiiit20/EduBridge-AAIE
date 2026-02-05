import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const extractText = (text) => apiClient.post("/extract_text", { text });

export const uploadPDF = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/upload_pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const simplifyText = (text) => apiClient.post("/simplify_text", { text });

export const generateMindmap = (text) => apiClient.post("/generate_mindmap", { text });

export const generateFlashcards = (text) => apiClient.post("/generate_flashcards", { text });

export const translateText = (text) => axios.post(`${API_BASE_URL}/translate`, { text });

export const generateAudio = (text, language) => {
  return axios.post(`${API_BASE_URL}/generate_audio`, { text, language }, { responseType: "blob" });
};

// NOTES (single)
export const exportNotesPDF = (topicName, content, templateDataUrl) => {
  return axios.post(
    `${API_BASE_URL}/export/notes/pdf`,
    { topic_name: topicName, content, template_data_url: templateDataUrl },
    { responseType: "blob" }
  );
};

// MINDMAP (single)
export const exportMindmapPDF = (topicName, mindmapImageDataUrl, templateDataUrl) => {
  return axios.post(
    `${API_BASE_URL}/export/mindmap/pdf`,
    { topic_name: topicName, mindmap_image_data_url: mindmapImageDataUrl, template_data_url: templateDataUrl },
    { responseType: "blob" }
  );
};

// ✅ TOPIC COMBINED (notes + mindmap)
export const exportTopicCombinedPDF = (topicName, content, mindmapImageDataUrl, templateDataUrl) => {
  return axios.post(
    `${API_BASE_URL}/export/topic/combined/pdf`,
    { topic_name: topicName, content, mindmap_image_data_url: mindmapImageDataUrl, template_data_url: templateDataUrl },
    { responseType: "blob" }
  );
};

// CHAPTER (notes only)
export const exportChapterPDF = (chapterTitle, topics, templateDataUrl) => {
  return axios.post(
    `${API_BASE_URL}/export/chapter/pdf`,
    { chapter_title: chapterTitle, topics, template_data_url: templateDataUrl },
    { responseType: "blob" }
  );
};

// ✅ CHAPTER COMBINED (notes + mindmaps)
export const exportChapterCombinedPDF = (chapterTitle, topics, templateDataUrl) => {
  return axios.post(
    `${API_BASE_URL}/export/chapter/combined/pdf`,
    { chapter_title: chapterTitle, topics, template_data_url: templateDataUrl },
    { responseType: "blob" }
  );
};

export default apiClient;
