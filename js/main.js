import {
  initTabs, initProfileSwitcher, initMobileMenu,
  initProfile,
  initWorkouts,
  initNutrition,
  initStats,
  renderDashboard,
} from './ui.js';

console.log('[FitTrack] main.js загружен');

(function migrate() {
  const PREFIX = 'fittrack_';
  try {
    const oldProfile = localStorage.getItem(PREFIX + 'profile');
    const profiles = localStorage.getItem(PREFIX + 'profiles');
    if (oldProfile && !profiles) {
      const p = JSON.parse(oldProfile);
      const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
      localStorage.setItem(PREFIX + 'profiles', JSON.stringify([{ id, name: 'Профиль 1', ...p }]));
      localStorage.setItem(PREFIX + 'activeProfileId', JSON.stringify(id));
      ['workouts', 'meals', 'weightLog'].forEach(key => {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return;
        const arr = JSON.parse(raw).map(x => ({ ...x, profileId: id }));
        localStorage.setItem(PREFIX + key, JSON.stringify(arr));
      });
      localStorage.removeItem(PREFIX + 'profile');
    }
  } catch (e) {}
})();

function safe(name, fn) {
  try { fn(); console.log(`[FitTrack] ✓ ${name}`); }
  catch (e) { console.error(`[FitTrack] ✗ ${name}`, e); }
}
async function safeAsync(name, fn) {
  try { await fn(); console.log(`[FitTrack] ✓ ${name}`); }
  catch (e) { console.error(`[FitTrack] ✗ ${name}`, e); }
}

async function boot() {
  console.log('[FitTrack] boot start');
  safe('initTabs', initTabs);
  safe('initMobileMenu', initMobileMenu);
  safe('initProfileSwitcher', initProfileSwitcher);
  safe('initProfile', initProfile);
  safe('initWorkouts', initWorkouts);
  await safeAsync('initNutrition', initNutrition);
  safe('initStats', initStats);
  safe('renderDashboard', renderDashboard);
  console.log('[FitTrack] boot finished');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}