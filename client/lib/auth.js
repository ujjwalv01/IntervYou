'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

// Storage keys keep the old app name so existing logins survive the rename.
const AUTH_KEY = 'intervu_auth';
const EVENT = 'intervu-auth'; // same-tab changes (the 'storage' event only fires in other tabs)

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

export function setAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

// Current { token, user } or null. Null during server render, then the stored value.
export function useAuth() {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(AUTH_KEY), () => null);
  return useMemo(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);
}

// Redirects when the login state doesn't match the page: 'in' pages need a login, 'out' pages (login/signup) don't.
export function useAuthRedirect(require = 'in') {
  const router = useRouter();
  useEffect(() => {
    const loggedIn = Boolean(getAuth()?.token);
    if (require === 'in' && !loggedIn) router.replace('/login');
    if (require === 'out' && loggedIn) router.replace('/dashboard');
  }, [require, router]);
  return useAuth();
}
