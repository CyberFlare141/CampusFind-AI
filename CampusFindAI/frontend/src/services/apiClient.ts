import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001/api';

export const apiClient = axios.create({
  baseURL,
});

export function publicAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, new URL(baseURL).origin).toString();
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('campusfind_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('campusfind:unauthorized'));
    }
    return Promise.reject(error);
  }
);
