import { useState, useEffect } from 'react';

const STORAGE_KEY = 'kaspit_user_id';

let currentIdentity = '';
let currentOnboarded = false;
let currentUnlocked = false;
const listeners = new Set();

function onboardedKey(id) {
  return `kaspit_onboarded_${id}`;
}

function readOnboarded(id) {
  if (!id) return false;
  try {
    return localStorage.getItem(onboardedKey(id)) === 'true';
  } catch {
    return false;
  }
}

try {
  currentIdentity = localStorage.getItem(STORAGE_KEY) || '';
} catch {}

currentOnboarded = readOnboarded(currentIdentity);

function notify() {
  listeners.forEach((fn) => fn());
}

export function getIdentity() {
  return currentIdentity;
}

export function isOnboarded() {
  return currentOnboarded;
}

export function setIdentity(value) {
  currentIdentity = value.trim();
  try {
    localStorage.setItem(STORAGE_KEY, currentIdentity);
  } catch {}
  currentOnboarded = readOnboarded(currentIdentity);
  notify();
}

export function setOnboarded(value = true) {
  currentOnboarded = value;
  if (currentIdentity) {
    try {
      localStorage.setItem(onboardedKey(currentIdentity), value ? 'true' : 'false');
    } catch {}
  }
  notify();
}

export function clearIdentity() {
  currentIdentity = '';
  currentOnboarded = false;
  currentUnlocked = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notify();
}

// --- אבטחת חשבון בסיסמה (נעילה מקומית) ---
function pinStorageKey(id) {
  return `kaspit_pin_${id}`;
}

function hashPin(pin, salt) {
  let h = 0x811c9dc5;
  const s = salt + ':' + pin;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function randomSalt() {
  return Math.random().toString(36).slice(2, 10);
}

export function hasPassword(identityId = currentIdentity) {
  if (!identityId) return false;
  try {
    return !!localStorage.getItem(pinStorageKey(identityId));
  } catch {
    return false;
  }
}

export function setPassword(identityId, pin) {
  const salt = randomSalt();
  const hash = hashPin(pin, salt);
  try {
    localStorage.setItem(pinStorageKey(identityId), JSON.stringify({ salt, hash }));
  } catch {}
  currentUnlocked = true;
  notify();
}

export function verifyPassword(identityId, pin) {
  try {
    const raw = localStorage.getItem(pinStorageKey(identityId));
    if (!raw) return false;
    const { salt, hash } = JSON.parse(raw);
    return hashPin(pin, salt) === hash;
  } catch {
    return false;
  }
}

export function removePassword(identityId = currentIdentity) {
  try {
    localStorage.removeItem(pinStorageKey(identityId));
  } catch {}
  currentUnlocked = true;
  notify();
}

export function isUnlocked() {
  return currentUnlocked;
}

export function unlock() {
  currentUnlocked = true;
  notify();
}

export function lockNow() {
  currentUnlocked = false;
  notify();
}

export function useUserIdentity() {
  const [, setLocal] = useState(0);

  useEffect(() => {
    const listener = () => setLocal((n) => n + 1);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return {
    identity: currentIdentity,
    onboarded: currentOnboarded,
    unlocked: currentUnlocked,
    setIdentity,
    setOnboarded,
    clearIdentity,
    hasPassword,
    setPassword,
    verifyPassword,
    removePassword,
    isUnlocked,
    unlock,
    lockNow,
  };
}