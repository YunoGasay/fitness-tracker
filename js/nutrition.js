import { load, save } from './storage.js';
import { getActiveProfileId } from './profile.js';

const KEY = 'meals';
let foodsCache = null;

export async function loadFoods() {
  if (foodsCache) return foodsCache;
  const res = await fetch('data/foods.json');
  foodsCache = await res.json();
  return foodsCache;
}

export function getFoodsSync() {
  return foodsCache || [];
}

export function getMeals(profileId = getActiveProfileId()) {
  return load(KEY, []).filter(m => m.profileId === profileId);
}

export function addMeal(meal, profileId = getActiveProfileId()) {
  if (!profileId) return [];
  const all = load(KEY, []);
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    profileId,
    ...meal,
  };
  all.push(item);
  all.sort((a, b) => b.date.localeCompare(a.date));
  save(KEY, all);
  return getMeals(profileId);
}

export function deleteMeal(id) {
  const all = load(KEY, []).filter(m => m.id !== id);
  save(KEY, all);
  return getMeals();
}

export function calcMealKcal({ foodId, grams, manualKcal }) {
  if (manualKcal && Number(manualKcal) > 0) return Math.round(Number(manualKcal));
  const food = getFoodsSync().find(f => f.id === foodId);
  if (!food) return 0;
  return Math.round(food.kcalPer100 * (Number(grams) / 100));
}

export function validateMeal(data) {
  const errors = [];
  if (!data.date) errors.push('Укажите дату');
  const manual = Number(data.manualKcal);
  if (manual > 0) return errors;
  if (!data.foodId) errors.push('Выберите блюдо');
  if (!(data.grams >= 1 && data.grams <= 2000)) errors.push('Порция: 1–2000 г');
  return errors;
}