const STORAGE_KEY = 'kaspit_anon_id';

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getAnonymousId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = 'anon_' + generateId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}