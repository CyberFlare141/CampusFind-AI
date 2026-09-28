const buildConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

export function getRuntimeConfig() {
  if (typeof window === 'undefined') return buildConfig;

  const runtimeConfig = window.__CAMPUSFIND_CONFIG__ || {};
  return {
    apiBaseUrl: runtimeConfig.apiBaseUrl || buildConfig.apiBaseUrl,
    googleClientId: runtimeConfig.googleClientId || buildConfig.googleClientId,
  };
}

export const runtimeConfig = getRuntimeConfig();
