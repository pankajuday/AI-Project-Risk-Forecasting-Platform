import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URI || 'http://127.0.0.1:3000';

export const TOKEN_STORAGE_KEY = 'ai_risk_platform_token';

const api = axios.create({
  baseURL: `${BASE_URL}/v1/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth / User
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/user/login', data),
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/user/register', data),
  logout: () => api.post('/user/logout'),
  getMe: () => api.get('/user/me'),
};

// Projects
export const projectsApi = {
  create: (data: { name: string; description?: string }) => api.post('/project/create', data),

  list: () => api.get('/project/list'),

  get: (projectId: string) => api.get(`/project/${projectId}`),

  delete: (projectId: string) => api.delete(`/project/${projectId}`),
};

// Documents
export const documentsApi = {
  upload: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/document/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (projectId: string) => api.get(`/document/${projectId}/list`),

  getStatus: (projectId: string, documentId: string) =>
    api.get(`/document/${projectId}/status/${documentId}`),

  viewUrl: (projectId: string, filename: string) =>
    api.get(`/document/${encodeURIComponent(projectId)}/view/${encodeURIComponent(filename)}`, {
      responseType: 'arraybuffer',
    }),

  delete: (projectId: string, documentId: string) =>
    api.delete(`/document/${projectId}/delete/${documentId}`),
};

// Analysis
export const analysisApi = {
  run: (projectId: string) => api.post(`/analysis/${projectId}/run`),

  getStatus: (projectId: string) => api.get(`/analysis/${projectId}/status`),

  getReport: (projectId: string) => api.get(`/analysis/${projectId}/report`),

  getDocuments: (projectId: string) => api.get(`/analysis/${projectId}/documents`),

  generateMissing: (projectId: string) => api.post(`/analysis/${projectId}/generate-missing`),

  getDocAudit: (projectId: string) => api.get(`/analysis/${projectId}/doc-audit`),
};

// Chat
export const chatApi = {
  sendMessage: (projectId: string, message: string) =>
    api.post(`/chat/${projectId}/message`, { message }),

  getHistory: (projectId: string) => api.get(`/chat/${projectId}/history`),

  clearHistory: (projectId: string) => api.delete(`/chat/${projectId}/history`),
};
