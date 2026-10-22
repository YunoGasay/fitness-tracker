import { load, save } from './storage.js';
import { getActiveProfileId, getActiveProfile } from './profile.js';

const KEY = 'workouts';

const MET = {
  run: 9.8,
  walk: 3.5,
  cycle: 7.5,
  strength: 6.0,
  swim: 8.0,
  yoga: 2.5,
};

const LABELS = {
  run: 'Бег',
  walk: 'Ходьба',
  cycle: 'Велосипед',
  strength: 'Силовая',
  swim: 'Плавание',
  yoga: 'Йога',
};

export function getWorkouts(profileId = getActiveProfileId()) {
  return load(KEY, []).filter(w => w.profileId === profileId);
}

export function typeLabel(type) {
  return LABELS[type] || type;
}

export function calcWorkoutKcal({ type, duration, intensity }) {
  const profile = getActiveProfile();
  const weight = profile ? profile.weight : 70;
  const met = MET[type] || 5;
  return Math.round(met * weight * (duration / 60) * intensity);
}

export function addWorkout(w, profileId = getActiveProfileId()) {
  if (!profileId) return [];
  const all = load(KEY, []);
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    profileId,
    ...w,
    kcal: calcWorkoutKcal(w),
  };
  all.push(item);
  all.sort((a, b) => b.date.localeCompare(a.date));
  save(KEY, all);
  return getWorkouts(profileId);
}

export function deleteWorkout(id) {
  const all = load(KEY, []).filter(w => w.id !== id);
  save(KEY, all);
  return getWorkouts();
}

export function validateWorkout(data) {
  const errors = [];
  if (!MET[data.type]) errors.push('Выберите тип тренировки');
  if (!data.date) errors.push('Укажите дату');
  if (!(data.duration >= 1 && data.duration <= 600)) errors.push('Длительность: 1–600 мин');
  return errors;
}