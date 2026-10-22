// Обёртка над localStorage с безопасным парсингом
const PREFIX = 'fittrack_';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('storage load error', key, e);
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('storage save error', key, e);
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}