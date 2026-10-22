// ============================================================
// charts.js — отрисовка графиков на <canvas> без внешних библиотек
// ============================================================

function getColors() {
  const style = getComputedStyle(document.body);
  const primary = style.getPropertyValue('--primary').trim() || '#2f6df6';
  return {
    axis: '#e3e9f0',
    text: '#6b7a8d',
    line: primary,
    lineFill: primary === '#ec4899' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(47, 109, 246, 0.12)',
    bar: style.getPropertyValue('--accent').trim() || '#16b98a',
    empty: '#6b7a8d',
  };
}

const PADDING = { top: 16, right: 16, bottom: 30, left: 44 };

function prepare(canvas) {
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(200, Math.round(rect.width || canvas.clientWidth || 600));
  const h = Math.round(rect.height || Number(canvas.getAttribute('height')) || 220);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function niceMax(v) {
  if (!isFinite(v) || v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  let m;
  if (n <= 1) m = 1;
  else if (n <= 2) m = 2;
  else if (n <= 5) m = 5;
  else m = 10;
  return m * pow;
}

function drawAxes(ctx, w, h, maxY, COLORS) {
  const x0 = PADDING.left;
  const y0 = h - PADDING.bottom;
  const x1 = w - PADDING.right;
  const y1 = PADDING.top;

  ctx.save();
  ctx.strokeStyle = COLORS.axis;
  ctx.fillStyle = COLORS.text;
  ctx.font = '11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.lineWidth = 1;

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxY / steps) * i;
    const y = y0 - ((y0 - y1) * i) / steps;

    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(val).toLocaleString('ru-RU'), x0 - 6, y);
  }
  ctx.restore();

  return { x0, y0, x1, y1 };
}

function drawXLabels(ctx, points, xs, y0, COLORS) {
  const n = points.length;
  if (!n) return;
  const step = Math.max(1, Math.ceil(n / 6));

  ctx.save();
  ctx.fillStyle = COLORS.text;
  ctx.font = '11px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  points.forEach((p, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const label = String(p.label || '');
    const short = label.length > 5 ? label.slice(5) : label;
    ctx.fillText(short, xs[i], y0 + 6);
  });
  ctx.restore();
}

function drawEmpty(ctx, w, h, text = 'Нет данных', COLORS) {
  ctx.save();
  ctx.fillStyle = COLORS.empty;
  ctx.font = '13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  ctx.restore();
}

function normalize(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter(p => p && isFinite(Number(p.value)))
    .map(p => ({ label: String(p.label ?? ''), value: Math.max(0, Number(p.value)) }));
}

export function drawLineChart(canvas, points) {
  const ctxInfo = prepare(canvas);
  if (!ctxInfo) return;
  const { ctx, w, h } = ctxInfo;
  const COLORS = getColors();

  const data = normalize(points);
  if (!data.length) {
    drawEmpty(ctx, w, h, 'Нет данных', COLORS);
    return;
  }

  const maxVal = Math.max(...data.map(p => p.value), 1);
  const maxY = niceMax(maxVal * 1.15);
  const { x0, y0, x1, y1 } = drawAxes(ctx, w, h, maxY, COLORS);

  const n = data.length;
  const dx = n > 1 ? (x1 - x0) / (n - 1) : 0;

  const xs = data.map((_, i) => (n > 1 ? x0 + dx * i : (x0 + x1) / 2));
  const ys = data.map(p => y0 - ((y0 - y1) * p.value) / maxY);

  if (n > 1) {
    const grad = ctx.createLinearGradient(0, y1, 0, y0);
    grad.addColorStop(0, COLORS.lineFill);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(xs[0], y0);
    for (let i = 0; i < n; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.lineTo(xs[n - 1], y0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (n > 1) {
    ctx.save();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i]);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = COLORS.line;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(xs[i], ys[i], 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = COLORS.line;
  ctx.font = 'bold 12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const lastVal = data[n - 1].value;
  ctx.fillText(
    lastVal.toLocaleString('ru-RU'),
    Math.min(xs[n - 1] + 4, x1),
    Math.max(ys[n - 1] - 8, y1 + 12)
  );
  ctx.restore();

  drawXLabels(ctx, data, xs, y0, COLORS);
}

export function drawBarChart(canvas, points) {
  const ctxInfo = prepare(canvas);
  if (!ctxInfo) return;
  const { ctx, w, h } = ctxInfo;
  const COLORS = getColors();

  const data = normalize(points);
  if (!data.length) {
    drawEmpty(ctx, w, h, 'Нет данных', COLORS);
    return;
  }

  const maxVal = Math.max(...data.map(p => p.value), 1);
  const maxY = niceMax(maxVal * 1.15);
  const { x0, y0, x1, y1 } = drawAxes(ctx, w, h, maxY, COLORS);

  const n = data.length;
  const slot = (x1 - x0) / n;
  const barW = Math.max(3, Math.min(28, slot * 0.65));

  const xs = [];

  ctx.save();
  ctx.fillStyle = COLORS.bar;

  data.forEach((p, i) => {
    const cx = x0 + slot * i + slot / 2;
    xs.push(cx);

    const barH = ((y0 - y1) * p.value) / maxY;
    if (barH <= 0) return;

    const x = cx - barW / 2;
    const y = y0 - barH;

    const r = Math.min(4, barW / 2, barH);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y0);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  drawXLabels(ctx, data, xs, y0, COLORS);
}