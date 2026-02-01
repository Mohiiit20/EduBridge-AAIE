import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Text extraction and structuring
export const extractText = (text) => {
  return apiClient.post('/extract_text', { text });
};

// PDF upload and processing
export const uploadPDF = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/upload_pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Simplify text
export const simplifyText = (text) => {
  return apiClient.post('/simplify_text', { text });
};

// Generate mind map
export const generateMindmap = (text) => {
  return apiClient.post('/generate_mindmap', { text });
};

// Generate flashcards
export const generateFlashcards = (text) => {
  return apiClient.post('/generate_flashcards', { text });
};

export const translateText = (text) => {
  return axios.post(`${API_BASE_URL}/translate`, { text });
};

// NEW: Audio Generation API
export const generateAudio = (text, language) => {
  return axios.post(
    `${API_BASE_URL}/generate_audio`,
    { text, language },
    {
      responseType: "blob", // Important for audio file
    }
  );
};

export default apiClient;