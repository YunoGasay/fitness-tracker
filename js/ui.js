import {
  getProfiles, getActiveProfileId, setActiveProfileId, getActiveProfile,
  createProfile, updateProfile, deleteProfile,
  calcBMR, calcTDEE, calcGoalKcal, validateProfile,
  getWeightLog, addWeightEntry,
} from './profile.js';
import {
  getWorkouts, addWorkout, deleteWorkout, validateWorkout, typeLabel,
} from './workouts.js';
import {
  loadFoods, getFoodsSync, getMeals, addMeal, deleteMeal,
  calcMealKcal, validateMeal,
} from './nutrition.js';
import { aggregate, todayTotals, toISO } from './stats.js';
import { drawLineChart, drawBarChart } from './charts.js';

// ---------- Утилиты ----------
function setMsg(el, text, type = '') {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ' ' + type : '');
}
function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
function todayISO() { return toISO(new Date()); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function $(id) { return document.getElementById(id); }

// ---------- Навигация (Вкладки) ----------
export function initTabs() {
  const buttons = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));

      if (tab === 'dashboard') renderDashboard();
      if (tab === 'stats') renderStats();
    });
  });
}

// ---------- Мобильное меню (Бургер) ----------
export function initMobileMenu() {
  const btn = $('burger-btn');
  const menu = $('mobile-menu');
  if (!btn || !menu) return;

  const close = () => {
    menu.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Открыть меню');
  };

  const open = () => {
    menu.classList.add('is-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Закрыть меню');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('is-open')) close();
    else open();
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('.nav-btn')) close();
  });

  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (menu.contains(e.target) || btn.contains(e.target)) return;
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) close();
  });
}

// ---------- Переключатель профиля ----------
export function initProfileSwitcher() {
  const sel = $('profile-select');
  const newBtn = $('profile-new-btn');
  const delBtn = $('profile-del-btn');
  if (!sel || !newBtn || !delBtn) return;

  renderProfileSwitcher();

  sel.addEventListener('change', () => {
    setActiveProfileId(sel.value || null);
    refreshAllViews();
  });

  newBtn.addEventListener('click', () => {
    const name = prompt('Имя нового профиля:', 'Пользователь');
    if (!name || !name.trim()) return;
    const p = createProfile({
      name: name.trim(), sex: 'male', age: 30, height: 175, weight: 70, activity: 1.375, goal: 'maintain',
    });
    setActiveProfileId(p.id);
    refreshAllViews();
    const tabBtn = document.querySelector('.nav-btn[data-tab="profile"]');
    if (tabBtn) tabBtn.click();
  });

  delBtn.addEventListener('click', () => {
    const id = getActiveProfileId();
    if (!id) return;
    const p = getActiveProfile();
    if (!confirm(`Удалить профиль «${p?.name || ''}» и все его данные?`)) return;
    deleteProfile(id);
    refreshAllViews();
  });
}

export function renderProfileSwitcher() {
  const sel = $('profile-select');
  if (!sel) return;
  const profiles = getProfiles();
  const active = getActiveProfileId();

  if (!profiles.length) {
    sel.innerHTML = '<option value="">— нет профилей —</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = profiles.map(p =>
    `<option value="${p.id}"${p.id === active ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');
}

function refreshAllViews() {
  renderProfileSwitcher();
  resetProfileForm();
  renderProfile();
  renderWorkouts();
  renderNutrition();
  renderStats();
  renderDashboard();
}

// ---------- Профиль ----------
export function initProfile() {
  const form = $('profile-form');
  const msg = $('profile-msg');
  if (!form) return;

  const wDate = $('weight-log-date');
  if (wDate && !wDate.value) wDate.value = todayISO();

  resetProfileForm();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      name: (form.name?.value || '').trim(),
      sex: form.sex?.value || 'male',
      age: Number(form.age?.value) || 0,
      height: Number(form.height?.value) || 0,
      weight: Number(form.weight?.value) || 0,
      activity: Number(form.activity?.value) || 1.375,
      goal: form.goal?.value || 'maintain',
    };
    const errors = validateProfile(data);
    if (errors.length) { setMsg(msg, errors.join('; '), 'error'); return; }

    const activeId = getActiveProfileId();
    if (activeId) {
      updateProfile(activeId, data);
      setMsg(msg, 'Профиль сохранён', 'success');
    } else {
      const p = createProfile(data);
      setActiveProfileId(p.id);
      renderProfileSwitcher();
      setMsg(msg, 'Профиль создан', 'success');
    }
    
    renderProfile();
    renderDashboard(); 
    renderStats(); 
  });

  const addW = $('weight-log-btn');
  if (addW) {
    addW.addEventListener('click', () => {
      const wMsg = $('weight-msg');
      const wInput = $('weight-log-input');
      const weight = Number(wInput?.value);
      const date = (wDate?.value) || todayISO();

      if (!getActiveProfileId()) { setMsg(wMsg, 'Сначала создайте профиль', 'error'); return; }
      if (!(weight >= 30 && weight <= 300)) { setMsg(wMsg, 'Вес должен быть 30–300 кг', 'error'); return; }
      
      addWeightEntry({ date, weight });
      setMsg(wMsg, 'Запись добавлена', 'success');
      if (wInput) wInput.value = '';
      renderProfile();
      renderDashboard();
    });
  }
  renderProfile();
}

export function resetProfileForm() {
  const form = $('profile-form');
  if (!form) return;
  const p = getActiveProfile();
  if (!p) { form.reset(); return; }
  if (form.name) form.name.value = p.name || '';
  if (form.sex) form.sex.value = p.sex || 'male';
  if (form.age) form.age.value = p.age ?? '';
  if (form.height) form.height.value = p.height ?? '';
  if (form.weight) form.weight.value = p.weight ?? '';
  if (form.activity) form.activity.value = String(p.activity ?? 1.375);
  if (form.goal) form.goal.value = p.goal || 'maintain';
}

export function renderProfile() {
  const p = getActiveProfile();
  
  // ПЕРЕКЛЮЧЕНИЕ ЦВЕТОВОЙ ТЕМЫ
  if (p && p.sex === 'female') {
    document.body.classList.add('theme-female');
  } else {
    document.body.classList.remove('theme-female');
  }

  const bmrEl = $('pr-bmr');
  const tdeeEl = $('pr-tdee');
  const goalEl = $('pr-goal');
  if (!bmrEl || !tdeeEl || !goalEl) return;

  if (!p) { bmrEl.textContent = '—'; tdeeEl.textContent = '—'; goalEl.textContent = '—'; return; }
  try {
    bmrEl.textContent = fmt(calcBMR(p));
    tdeeEl.textContent = fmt(calcTDEE(p));
    goalEl.textContent = fmt(calcGoalKcal(p));
  } catch (e) { console.warn('calc error', e); }
}

// ---------- Тренировки ----------
export function initWorkouts() {
  const form = $('workout-form');
  const msg = $('workout-msg');
  if (!form) return;
  if (form.date && !form.date.value) form.date.value = todayISO();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!getActiveProfileId()) { setMsg(msg, 'Сначала создайте профиль', 'error'); return; }
    const data = {
      type: form.type?.value || 'run',
      date: form.date?.value || todayISO(),
      duration: Number(form.duration?.value) || 0,
      intensity: Number(form.intensity?.value) || 1,
    };
    const errors = validateWorkout(data);
    if (errors.length) { setMsg(msg, errors.join('; '), 'error'); return; }
    
    addWorkout(data);
    setMsg(msg, 'Тренировка добавлена', 'success');
    if (form.duration) form.duration.value = '';
    renderWorkouts();
    renderDashboard();
  });

  const list = $('workout-list');
  if (list) {
    list.addEventListener('click', e => {
      const btn = e.target.closest('.btn-del');
      if (!btn) return;
      deleteWorkout(btn.dataset.id);
      renderWorkouts();
      renderDashboard();
    });
  }
  renderWorkouts();
}

export function renderWorkouts() {
  const list = $('workout-list');
  if (!list) return;
  const items = getWorkouts();
  if (!items.length) { list.innerHTML = '<li class="empty">Пока нет тренировок</li>'; return; }
  list.innerHTML = items.map(w => `
    <li>
      <div class="item-main">
        <strong>${typeLabel(w.type)} — ${w.duration} мин</strong>
        <small>${w.date} · интенсивность ×${w.intensity}</small>
      </div>
      <span class="item-kcal">${fmt(w.kcal)} ккал</span>
      <button class="btn-del" data-id="${w.id}">Удалить</button>
    </li>
  `).join('');
}

// ---------- Питание ----------
export async function initNutrition() {
  const form = $('food-form');
  const msg = $('food-msg');
  const select = $('food-select');
  if (!form || !select) return;

  try {
    await loadFoods();
  } catch (e) {
    setMsg(msg, 'Не удалось загрузить справочник блюд', 'error');
    return;
  }

  select.innerHTML = getFoodsSync().map(f => `<option value="${f.id}">${f.name} (${f.kcalPer100} ккал/100г)</option>`).join('');
  if (form.date && !form.date.value) form.date.value = todayISO();

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!getActiveProfileId()) { setMsg(msg, 'Сначала создайте профиль', 'error'); return; }
    const data = {
      foodId: form.foodId?.value || '',
      grams: Number(form.grams?.value) || 0,
      date: form.date?.value || todayISO(),
      manualKcal: Number(form.manualKcal?.value) || 0,
    };
    const errors = validateMeal(data);
    if (errors.length) { setMsg(msg, errors.join('; '), 'error'); return; }

    const food = getFoodsSync().find(f => f.id === data.foodId);
    const kcal = calcMealKcal(data);
    addMeal({
      date: data.date,
      foodName: data.manualKcal > 0 ? 'Ручной ввод' : (food ? food.name : '—'),
      grams: data.grams,
      kcal,
    });
    setMsg(msg, `Добавлено: ${fmt(kcal)} ккал`, 'success');
    if (form.manualKcal) form.manualKcal.value = '';
    renderNutrition();
    renderDashboard();
  });

  if (form.date) form.date.addEventListener('change', renderNutrition);

  const list = $('food-list');
  if (list) {
    list.addEventListener('click', e => {
      const btn = e.target.closest('.btn-del');
      if (!btn) return;
      deleteMeal(btn.dataset.id);
      renderNutrition();
      renderDashboard();
    });
  }
  renderNutrition();
}

export function renderNutrition() {
  const list = $('food-list');
  const totalEl = $('food-day-total');
  const dateInput = $('food-form')?.date;
  if (!list || !totalEl) return;

  const date = dateInput?.value || todayISO();
  const meals = getMeals().filter(m => m.date === date);
  const total = meals.reduce((s, m) => s + m.kcal, 0);
  totalEl.textContent = fmt(total);

  if (!meals.length) { list.innerHTML = '<li class="empty">За эту дату ничего не добавлено</li>'; return; }
  list.innerHTML = meals.map(m => `
    <li>
      <div class="item-main">
        <strong>${escapeHtml(m.foodName)}</strong>
        <small>${m.grams} г · ${m.date}</small>
      </div>
      <span class="item-kcal">${fmt(m.kcal)} ккал</span>
      <button class="btn-del" data-id="${m.id}">Удалить</button>
    </li>
  `).join('');
}

// ---------- Дашборд ----------
export function renderDashboard() {
  const p = getActiveProfile();
  const tdeeEl = $('dash-tdee');
  if (tdeeEl) tdeeEl.textContent = p ? fmt(calcGoalKcal(p)) : '—';

  const t = todayTotals();
  const b = $('dash-burned'), e = $('dash-eaten'), bal = $('dash-balance');
  if (b) b.textContent = fmt(t.burned);
  if (e) e.textContent = fmt(t.eaten);
  if (bal) bal.textContent = fmt(t.balance);

  const canvas = $('chart-weight');
  if (canvas) {
    const log = getWeightLog();
    drawLineChart(canvas, log.map(x => ({ label: x.date, value: x.weight })));
  }
}

// ---------- Статистика ----------
export function initStats() {
  const sel = $('stats-period');
  if (sel) sel.addEventListener('change', renderStats);
  renderStats();
}

export function renderStats() {
  const sel = $('stats-period');
  if (!sel) return;
  const n = Number(sel.value) || 30;
  let agg;
  try { agg = aggregate(n); } catch (e) { return; }

  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('st-count', agg.count);
  set('st-burned', fmt(agg.totalBurned));
  set('st-eaten', fmt(agg.totalEaten));
  set('st-balance', fmt(agg.balance));

  const c1 = $('chart-burned');
  if (c1) drawBarChart(c1, agg.dates.map(d => ({ label: d, value: agg.burnedByDay[d] })));
  const c2 = $('chart-eaten');
  if (c2) drawBarChart(c2, agg.dates.map(d => ({ label: d, value: agg.eatenByDay[d] })));
}

// ---------- Глобальный ресайз графиков ----------
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderDashboard();
    renderStats();
  }, 200);
});