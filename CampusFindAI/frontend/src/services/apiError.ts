import axios from 'axios';

export function getApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) {
    return 'Cannot reach the API. Start the backend and confirm VITE_API_BASE_URL in frontend/.env.';
  }
  const data = error.response?.data as { message?: string; title?: string; errors?: Record<string, string[]> } | undefined;
  const validation = data?.errors && Object.values(data.errors).flat()[0];
  return validation || data?.message || data?.title || fallback;
}
