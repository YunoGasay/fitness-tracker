import { getWorkouts } from './workouts.js';
import { getMeals } from './nutrition.js';

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateRange(n) {
  const start = daysAgo(n);
  const out = [];
  const cur = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cur <= today) {
    out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function aggregate(n) {
  const dates = dateRange(n);
  const set = new Set(dates);
  const workouts = getWorkouts().filter(w => set.has(w.date));
  const meals = getMeals().filter(m => set.has(m.date));

  const burnedByDay = {};
  const eatenByDay = {};
  dates.forEach(d => { burnedByDay[d] = 0; eatenByDay[d] = 0; });

  workouts.forEach(w => { burnedByDay[w.date] += w.kcal; });
  meals.forEach(m => { eatenByDay[m.date] += m.kcal; });

  const totalBurned = workouts.reduce((s, w) => s + w.kcal, 0);
  const totalEaten = meals.reduce((s, m) => s + m.kcal, 0);

  return {
    dates,
    burnedByDay,
    eatenByDay,
    count: workouts.length,
    totalBurned,
    totalEaten,
    balance: totalEaten - totalBurned,
    workouts,
    meals,
  };
}

export function todayTotals() {
  const today = toISO(new Date());
  const burned = getWorkouts()
    .filter(w => w.date === today)
    .reduce((s, w) => s + w.kcal, 0);
  const eaten = getMeals()
    .filter(m => m.date === today)
    .reduce((s, m) => s + m.kcal, 0);
  return { burned, eaten, balance: eaten - burned, today };
}