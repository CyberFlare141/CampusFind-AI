// Thin fetch wrapper around the CampusFind AI backend.
//
// Matches the backend exactly as implemented:
//   - Base route prefix: /api/[controller]  (see Controllers/*.cs)
//   - Auth: Bearer JWT in the Authorization header (see Extensions/IdentityExtensions.cs)
//   - Error shape on failure: { status: number, message: string }
//     (see Middleware/GlobalExceptionHandlerMiddleware.cs)
//   - Validation failures (invalid ModelState) come back as the default
//     ASP.NET Core ProblemDetails shape: { title, errors: { Field: [...] } }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const TOKEN_KEY = 'campusfind.token';
const USER_KEY = 'campusfind.user';
const EXPIRES_KEY = 'campusfind.expiresAt';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCachedUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getTokenExpiry() {
  const raw = localStorage.getItem(EXPIRES_KEY);
  return raw ? new Date(raw) : null;
}

export function saveSession({ token, expiresAt, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (expiresAt) localStorage.setItem(EXPIRES_KEY, expiresAt);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export function isTokenExpired() {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  return Date.now() >= expiry.getTime();
}

/**
 * Normalizes any backend error response into a single Error object
 * with a human-readable `.message` and, when present, a `.fieldErrors` map.
 */
async function parseErrorResponse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON body (e.g. plain 401 with no content) — fall through.
  }

  const error = new Error();
  error.status = response.status;

  if (body && typeof body === 'object') {
    if (body.message) {
      // GlobalExceptionHandlerMiddleware shape: { status, message }
      error.message = body.message;
    } else if (body.errors) {
      // ASP.NET Core ProblemDetails validation shape: { title, errors: { Field: [msgs] } }
      error.fieldErrors = body.errors;
      const firstField = Object.keys(body.errors)[0];
      error.message = firstField
        ? body.errors[firstField][0]
        : body.title || 'Please check the form and try again.';
    } else if (body.title) {
      error.message = body.title;
    }
  }

  if (!error.message) {
    if (response.status === 401) error.message = 'You need to sign in to do that.';
    else if (response.status === 403) error.message = "You don't have permission to do that.";
    else if (response.status === 404) error.message = 'We couldn\u2019t find what you were looking for.';
    else error.message = 'Something went wrong. Please try again.';
  }

  return error;
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * @param {string} path e.g. '/auth/login'
 * @param {object} options fetch options, plus optional `auth` (default true)
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, signal } = {}) {
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
      signal,
    });
  } catch (networkErr) {
    const err = new Error(
      `Could not reach the CampusFind AI server at ${API_BASE_URL}. Make sure the backend is running.`
    );
    err.status = 0;
    err.cause = networkErr;
    throw err;
  }

  if (response.status === 401 && auth) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export { API_BASE_URL };

export function publicAssetUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}/${path.replace(/^\//, '')}`;
}
