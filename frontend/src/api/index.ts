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

  /**
   * Streams the raw file bytes through the backend (backend proxies from S3).
   * Used for DOCX (docx-preview), XLSX (SheetJS), and plain-text types.
   * No CORS issues — the browser only talks to the FastAPI backend.
   */
  viewUrl: (projectId: string, filename: string) =>
    api.get(`/document/${encodeURIComponent(projectId)}/view/${encodeURIComponent(filename)}`, {
      responseType: 'arraybuffer',
    }),

  /**
   * Calls the /presign/ endpoint which returns { url, filename, expires_in }.
   * The presigned URL can be set directly as <img src> or <iframe src>
   * because those are plain browser GETs (not XHR/fetch — no CORS preflight).
   */
  getPresignedUrl: async (projectId: string, filename: string): Promise<string> => {
    const resp = await api.get<{ url: string }>(
      `/document/${encodeURIComponent(projectId)}/presign/${encodeURIComponent(filename)}`,
    );
    return resp.data.url;
  },

  /**
   * Same as getPresignedUrl but the resulting URL forces a file download
   * (Content-Disposition: attachment is baked into the presigned URL).
   */
  getDownloadUrl: async (projectId: string, filename: string): Promise<string> => {
    const resp = await api.get<{ url: string }>(
      `/document/${encodeURIComponent(projectId)}/presign/${encodeURIComponent(filename)}`,
      { params: { download: true } },
    );
    return resp.data.url;
  },

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
