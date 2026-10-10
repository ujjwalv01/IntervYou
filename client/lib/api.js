import { getAuth, clearAuth } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

async function request(method, endpoint, body) {
  const token = getAuth()?.token;
  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      method,
      // Content-Type only when there's a body: a header-free GET skips the browser's CORS preflight round trip.
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  // Expired or invalid token: log out instead of leaving the user stuck on errors.
  if (res.status === 401 && token) {
    clearAuth();
    window.location.href = '/login';
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const get = (endpoint) => request('GET', endpoint);
export const post = (endpoint, body) => request('POST', endpoint, body);
export const patch = (endpoint, body) => request('PATCH', endpoint, body);
export const put = (endpoint, body) => request('PUT', endpoint, body);
export const del = (endpoint) => request('DELETE', endpoint);
