import { load, save } from './storage.js';

const PROFILES_KEY = 'profiles';
const ACTIVE_KEY = 'activeProfileId';
const WKEY = 'weightLog';

// ---------- CRUD профилей ----------

export function getProfiles() {
  return load(PROFILES_KEY, []);
}

export function getActiveProfileId() {
  return load(ACTIVE_KEY, null);
}

export function setActiveProfileId(id) {
  save(ACTIVE_KEY, id);
}

export function getActiveProfile() {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find(p => p.id === id) || null;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function createProfile(data) {
  const profiles = getProfiles();
  const profile = { ...data, id: uid() };
  profiles.push(profile);
  save(PROFILES_KEY, profiles);
  if (!getActiveProfileId()) setActiveProfileId(profile.id);
  return profile;
}

export function updateProfile(id, data) {
  const profiles = getProfiles().map(p =>
    p.id === id ? { ...p, ...data, id } : p
  );
  save(PROFILES_KEY, profiles);
  return profiles.find(p => p.id === id) || null;
}

export function deleteProfile(id) {
  const profiles = getProfiles().filter(p => p.id !== id);
  save(PROFILES_KEY, profiles);

  // Чистим связанные данные профиля
  const w = load('workouts', []).filter(x => x.profileId !== id);
  save('workouts', w);
  const m = load('meals', []).filter(x => x.profileId !== id);
  save('meals', m);
  const wl = load(WKEY, []).filter(x => x.profileId !== id);
  save(WKEY, wl);

  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0]?.id || null);
  }
  return profiles;
}

// ---------- Расчёты ----------

export function calcBMR({ sex, age, height, weight }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calcTDEE(profile) {
  return calcBMR(profile) * Number(profile.activity);
}

export function calcGoalKcal(profile) {
  const tdee = calcTDEE(profile);
  if (profile.goal === 'lose') return tdee * 0.85;
  if (profile.goal === 'gain') return tdee * 1.15;
  return tdee;
}

export function validateProfile(data) {
  const errors = [];
  if (!data.name || !String(data.name).trim()) errors.push('Укажите имя профиля');
  if (!['male', 'female'].includes(data.sex)) errors.push('Пол указан неверно');
  if (!(data.age >= 10 && data.age <= 100)) errors.push('Возраст: 10–100');
  if (!(data.height >= 100 && data.height <= 250)) errors.push('Рост: 100–250 см');
  if (!(data.weight >= 30 && data.weight <= 300)) errors.push('Вес: 30–300 кг');
  return errors;
}

// ---------- Журнал веса (привязан к профилю) ----------

export function getWeightLog(profileId = getActiveProfileId()) {
  return load(WKEY, []).filter(x => x.profileId === profileId);
}

export function addWeightEntry({ date, weight }, profileId = getActiveProfileId()) {
  if (!profileId) return [];
  const log = load(WKEY, []).filter(
    x => !(x.profileId === profileId && x.date === date)
  );
  log.push({ profileId, date, weight });
  log.sort((a, b) => a.date.localeCompare(b.date));
  save(WKEY, log);

  // Синхронизируем вес в профиле
  if (getActiveProfileId() === profileId) {
    updateProfile(profileId, { weight });
  }
  return getWeightLog(profileId);
}