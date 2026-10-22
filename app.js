/* =========================================================
   Reminder — recordatorios simples y elegantes
   Todo vive en este dispositivo (localStorage). Sin servidores.
   ========================================================= */
(() => {
'use strict';

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;

const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromParts = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};
const sameDay = (a, b) => ymd(a) === ymd(b);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

const fmtTime = d => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const fmtLong = d => cap(d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
const fmtShort = d => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
function dayLabel(d, now = new Date()) {
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^./, c => c.toUpperCase()) + ' ' + d.getDate();
  return fmtShort(d);
}
// «Sábado 25», «Hoy, jueves 22», «Lunes 9 nov»
function dayFull(d, now = new Date()) {
  const wd = cap(d.toLocaleDateString('es-ES', { weekday: 'long' }));
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  const tail = d.getMonth() !== now.getMonth() || Math.abs(diff) > 27 ? ' ' + d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '') : '';
  if (diff === 0) return `Hoy, ${wd.toLowerCase()} ${d.getDate()}`;
  if (diff === 1) return `Mañana, ${wd.toLowerCase()} ${d.getDate()}`;
  return `${wd} ${d.getDate()}${tail}`;
}
function relLabel(ms, now = Date.now()) {
  const diff = ms - now, a = Math.abs(diff);
  const dir = diff >= 0;
  if (a < MIN) return dir ? 'ahora' : 'hace un momento';
  const tm = Math.round(a / MIN);
  if (tm < 60) return dir ? `en ${tm} min` : `hace ${tm} min`;
  if (a < DAY && sameDay(new Date(ms), new Date(now))) { const h = Math.floor(tm / 60), m = tm % 60; return (dir ? 'en ' : 'hace ') + h + ' h' + (m && h < 6 ? ` ${m} min` : ''); }
  const d = new Date(ms);
  return `${dayLabel(d)} · ${fmtTime(d)}`;
}

/* ---------- Constantes ---------- */
const CATS = [
  { id: 'personal', name: 'Personal' },
  { id: 'trabajo', name: 'Trabajo' },
  { id: 'casa', name: 'Casa' },
  { id: 'salud', name: 'Salud' },
  { id: 'finanzas', name: 'Finanzas' },
  { id: 'otros', name: 'Otros' },
];
const catColor = id => `var(--c-${CATS.some(c => c.id === id) ? id : 'otros'})`;
const REPEAT_LABEL = { none: '', daily: 'Cada día', weekdays: 'Laborables', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };
const TABS = { home: 'Inicio', calendar: 'Calendario', list: 'Recordatorios', done: 'Hecho', settings: 'Ajustes' };
const PROVIDERS = { google: 'Google Calendar', apple: 'Apple / iCal (.ics)', outlook: 'Outlook' };

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  bell: '<svg viewBox="0 0 512 512"><use href="#bell"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
};

/* ---------- Estado y persistencia ---------- */
const KEY = 'reminder.v1';
const DEFAULT_SETTINGS = { theme: 'auto', name: '', calProvider: 'google', autoCal: false, notify: false, sound: true };
let state = load();
// Una vez: pasar a Auto por horario (el botón de tema de arriba ya no existe)
if (!state.settings.autoV2) { state.settings.theme = 'auto'; state.settings.autoV2 = true; try { localStorage.setItem('reminder.v1', JSON.stringify(state)); } catch (e) { } }

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.reminders)) return { v: 1, reminders: s.reminders, tombstones: s.tombstones || {}, calTrash: s.calTrash || [], settings: { ...DEFAULT_SETTINGS, ...s.settings } };
  } catch (e) { /* datos corruptos o almacenamiento bloqueado */ }
  return { v: 1, reminders: [], tombstones: {}, calTrash: [], settings: { ...DEFAULT_SETTINGS } };
}

/* Cada cambio en un recordatorio recibe una marca de tiempo; los borrados dejan una «lápida».
   Así dos dispositivos pueden fusionar sus datos sin pisarse. */
let baseline = new Map();
const sig = r => { const { updatedAt, ...rest } = r; return JSON.stringify(rest); };
function setBaseline() { baseline = new Map(state.reminders.map(r => [r.id, { s: sig(r), ev: r.calEventId }])); }
function stamp() {
  const now = Date.now(), ids = new Set();
  for (const r of state.reminders) {
    ids.add(r.id);
    if (baseline.get(r.id)?.s !== sig(r)) { r.updatedAt = now; delete state.tombstones[r.id]; }
    if (!baseline.has(r.id) && r.calEventId) state.calTrash = state.calTrash.filter(x => x !== r.calEventId);
  }
  for (const [id, b] of baseline) if (!ids.has(id)) { state.tombstones[id] = now; if (b.ev) state.calTrash.push(b.ev); }
  for (const [id, t] of Object.entries(state.tombstones)) if (now - t > 90 * DAY) delete state.tombstones[id];
  setBaseline();
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('No se pudo guardar', 'El almacenamiento del navegador está lleno o bloqueado.'); }
}
function save() { stamp(); persist(); cloud.schedule(); }
function commit() { save(); render(); }
const byId = id => state.reminders.find(r => r.id === id);

/* ---------- Repeticiones ---------- */
function nextOccurrence(r, fromMs) {
  const d = new Date(fromMs);
  switch (r.repeat) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekdays': do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': {
      const day = r.anchorDay || d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
      break;
    }
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.getTime();
}
function occurrencesBetween(r, start, end) {
  if (r.done || r.repeat === 'none' || !r.repeat) return (r.due >= start && r.due < end) ? [r.due] : [];
  const out = []; let t = r.due, guard = 0;
  while (t < end && guard++ < 500) { if (t >= start) out.push(t); t = nextOccurrence(r, t); if (t == null) break; }
  return out;
}

/* ---------- Lenguaje natural (español) ---------- */
const deacc = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const WD = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMW = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50 };
const wdIndex = w => WD.indexOf(w.replace(/^(sabado|domingo)s$/, '$1'));

const HOURW = { una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
function parseNL(input, now = new Date()) {
  // Dictado: «a las diez y media» → «a las 10 y media»
  input = input.replace(/\b(las?)\s+(una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/gi, (m, art, w) => art + ' ' + HOURW[w.toLowerCase()]);
  let orig = ' ' + input.normalize('NFC') + ' ';
  let low = deacc(orig);
  const res = { date: null, time: null, repeat: null, chips: [] };
  const take = re => {
    const m = re.exec(low);
    if (!m) return null;
    const blank = ' '.repeat(m[0].length);
    low = low.slice(0, m.index) + blank + low.slice(m.index + m[0].length);
    orig = orig.slice(0, m.index) + blank + orig.slice(m.index + m[0].length);
    return m;
  };
  const nextWeekday = (idx, forceNext) => {
    const d = startOfDay(now); let diff = (idx - d.getDay() + 7) % 7;
    if (diff === 0 || forceNext) diff = diff === 0 ? 7 : diff;
    return addDays(d, diff);
  };
  const W = '(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)';
  let m;

  // Repetición
  if (take(/\b(cada dia|todos los dias|diariamente|a diario)\b/)) res.repeat = 'daily';
  else if (take(/\b(entre semana|de lunes a viernes|dias laborables|cada dia laborable)\b/)) res.repeat = 'weekdays';
  else if ((m = take(new RegExp(`\\b(?:cada|todos los) ${W}\\b`)))) { res.repeat = 'weekly'; res.date = nextWeekday(wdIndex(m[1])); }
  else if (take(/\b(cada semana|semanalmente|todas las semanas)\b/)) res.repeat = 'weekly';
  else if (take(/\b(cada mes|mensualmente|todos los meses)\b/)) res.repeat = 'monthly';
  else if (take(/\b(cada ano|anualmente|todos los anos)\b/)) res.repeat = 'yearly';

  // Relativo: "en 20 minutos", "en media hora", "en 2 días"
  if ((m = take(/\b(?:dentro de|en) (\d+|media|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta) (minutos?|mins?|horas?|h|dias?|semanas?|mes(?:es)?)\b/))) {
    let n = m[1] === 'media' ? 0.5 : (NUMW[m[1]] ?? parseInt(m[1], 10));
    const u = m[2];
    let t = new Date(now);
    if (/^min/.test(u)) t = new Date(+now + n * MIN);
    else if (/^h/.test(u)) t = new Date(+now + n * HOUR);
    else if (/^dia/.test(u)) t = addDays(now, n);
    else if (/^semana/.test(u)) t = addDays(now, n * 7);
    else { t = new Date(now); t.setMonth(t.getMonth() + n); }
    res.date = startOfDay(t);
    if (/^(min|h)/.test(u)) res.time = hm(t);
  }

  // Hora explícita
  if (!res.time) {
    const Q = '(de la manana|de la tarde|de la noche|de la madrugada|del mediodia|am|pm|a\\.m\\.|p\\.m\\.)';
    m = take(new RegExp(`\\b(?:a|sobre|hacia|para|desde) las? (\\d{1,2})(?:[:.h](\\d{2}))?\\s*(?:h|hs|horas)?(?:\\s*(y media|y cuarto|menos cuarto))?(?:\\s*${Q})?`))
      || take(new RegExp(`\\b(\\d{1,2})[:.](\\d{2})\\s*(?:h|hs)?()(?:\\s*${Q})?`))
      || take(new RegExp(`\\b(\\d{1,2})\\s*(?:h|hs)?()()\\s*${Q}`))
      || take(/\b(\d{1,2})h()()()\b/);
    if (m) {
      let h = parseInt(m[1], 10), min = m[2] ? parseInt(m[2], 10) : 0;
      const frac = m[3], q = m[4] || '';
      if (frac === 'y media') min = 30; else if (frac === 'y cuarto') min = 15; else if (frac === 'menos cuarto') { h -= 1; min = 45; }
      if (/tarde|pm|p\.m/.test(q) && h < 12) h += 12;
      else if (/noche/.test(q) && h >= 6 && h < 12) h += 12;
      else if (/noche/.test(q) && h === 12) h = 0;
      else if (/manana|am|a\.m|madrugada/.test(q) && h === 12) h = 0;
      else if (!q && !m[2] && h >= 1 && h <= 7) h += 12; // "a las 6" → 18:00
      if (h >= 0 && h < 24 && min < 60) res.time = `${pad(h)}:${pad(min)}`;
    }
  }

  // Momentos del día
  const tod = [
    [/\besta manana\b/, '09:00', 0], [/\besta tarde\b/, '17:00', 0], [/\besta noche\b/, '21:00', 0],
    [/\b(?:a |al )?mediodia\b/, '13:00'], [/\b(?:a )?medianoche\b/, '23:59'],
    [/\b(?:por|de) la manana\b/, '09:00'], [/\b(?:por|de) la tarde\b/, '17:00'], [/\b(?:por|de) la noche\b/, '21:00'],
    [/\ba primera hora\b/, '08:00'], [/\bal mediodia\b/, '13:00'],
  ];
  for (const [re, t, today] of tod) {
    if (take(re)) { if (!res.time) res.time = t; if (today === 0 && !res.date) res.date = startOfDay(now); }
  }

  // Fechas
  if (!res.date) {
    if (take(/\bpasado manana\b/)) res.date = addDays(startOfDay(now), 2);
    else if (take(/\bmanana\b/)) res.date = addDays(startOfDay(now), 1);
    else if (take(/\bhoy\b/)) res.date = startOfDay(now);
    else if (take(/\b(?:el |este )?fin(?:de)? de semana\b|\beste finde\b|\bel finde\b/)) res.date = nextWeekday(6);
    else if (take(/\b(?:la )?(?:proxima semana|semana que viene)\b/)) res.date = nextWeekday(1, true);
    else if ((m = take(new RegExp(`\\b(?:el |este |el proximo |proximo |la proxima semana el )?${W}(?: que viene| proximo)?\\b`)))) res.date = nextWeekday(wdIndex(m[1]));
    else if ((m = take(new RegExp(`\\b(?:el )?(?:dia )?(\\d{1,2}) de (${MONTHS.join('|')})(?: de (\\d{4}))?\\b`)))) {
      const y = m[3] ? +m[3] : now.getFullYear(); let d = new Date(y, MONTHS.indexOf(m[2]), +m[1]);
      if (!m[3] && d < startOfDay(now)) d.setFullYear(y + 1);
      res.date = d;
    }
    else if ((m = take(/\b(?:el )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      let y = m[3] ? +m[3] : now.getFullYear(); if (y < 100) y += 2000;
      let d = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && d < startOfDay(now)) d.setFullYear(y + 1);
      res.date = d;
    }
    else if ((m = take(/\bel (?:dia )?(\d{1,2})\b/))) {
      const n = +m[1];
      if (n >= 1 && n <= 31) {
        let d = new Date(now.getFullYear(), now.getMonth(), Math.min(n, daysInMonth(now.getFullYear(), now.getMonth())));
        if (d < startOfDay(now)) { const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1); d = new Date(nm.getFullYear(), nm.getMonth(), Math.min(n, daysInMonth(nm.getFullYear(), nm.getMonth()))); }
        res.date = d;
      }
    }
  }

  // Si hay hora sin fecha: hoy si aún no ha pasado, si no mañana
  if (res.time && !res.date) {
    const t = fromParts(ymd(now), res.time);
    res.date = t > now ? startOfDay(now) : addDays(startOfDay(now), 1);
  }
  if (res.repeat === 'monthly' && !res.date) res.date = startOfDay(now);

  // Limpieza del título
  let title = orig.replace(/\s+/g, ' ').trim();
  const STOP = /^(?:y|el|la|los|las|a|al|de|del|para|en|que|desde|sobre|hacia|por|,|-|—)$/i;
  let words = title.split(' ');
  while (words.length && STOP.test(words[words.length - 1])) words.pop();
  while (words.length > 1 && /^(?:y|,|-|—)$/i.test(words[0])) words.shift();
  title = words.join(' ').replace(/\s+([,.;:])/g, '$1').replace(/[,;:\-—]+$/, '').trim();
  res.title = title ? title[0].toUpperCase() + title.slice(1) : '';

  if (res.date) res.chips.push(ICON.cal + dayLabel(res.date, now));
  if (res.time) res.chips.push(ICON.clock + res.time);
  if (res.repeat) res.chips.push(ICON.repeat + REPEAT_LABEL[res.repeat]);
  res.matched = !!(res.date || res.time || res.repeat);
  return res;
}

/* ---------- Calendario externo ---------- */
const toUTC = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function rrule(r) {
  return { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' }[r.repeat] || '';
}
function googleUrl(r) {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: r.title,
    dates: `${toUTC(r.due)}/${toUTC(r.due + 30 * MIN)}`,
    details: (r.notes ? r.notes + '\n\n' : '') + 'Creado con Reminder 🔔',
  });
  if (rrule(r)) p.set('recur', 'RRULE:' + rrule(r));
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
function outlookUrl(r) {
  const p = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: r.title,
    startdt: new Date(r.due).toISOString(), enddt: new Date(r.due + 30 * MIN).toISOString(),
    body: (r.notes ? r.notes + '\n\n' : '') + 'Creado con Reminder',
  });
  return 'https://outlook.live.com/calendar/0/deeplink/compose?' + p.toString();
}
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
function icsEvent(r) {
  const lines = [
    'BEGIN:VEVENT', `UID:${r.id}@reminder.app`, `DTSTAMP:${toUTC(Date.now())}`,
    `DTSTART:${toUTC(r.due)}`, `DTEND:${toUTC(r.due + 30 * MIN)}`,
    `SUMMARY:${icsEsc(r.title)}`,
  ];
  if (r.notes) lines.push(`DESCRIPTION:${icsEsc(r.notes)}`);
  if (rrule(r)) lines.push('RRULE:' + rrule(r));
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(r.title)}`, `TRIGGER:-PT${r.alert || 0}M`, 'END:VALARM', 'END:VEVENT');
  return lines;
}
function icsFile(list) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reminder//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...list.flatMap(icsEvent), 'END:VCALENDAR'].join('\r\n');
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function sendToCalendar(r) {
  const p = state.settings.calProvider;
  if (p === 'apple') download(`${r.title.slice(0, 40).replace(/[^\w\sáéíóúñ-]/gi, '') || 'recordatorio'}.ics`, icsFile([r]), 'text/calendar');
  else window.open(p === 'outlook' ? outlookUrl(r) : googleUrl(r), '_blank', 'noopener');
  r.inCal = true;
}

/* ---------- Sonido (campana sintetizada) ---------- */
let audioCtx;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* sin audio */ }
}
function chime() {
  if (!state.settings.sound || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  [[0, 880], [0.18, 1318.5]].forEach(([dt, f]) => {
    [1, 2.76, 5.4].forEach((k, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f * k;
      const peak = [0.22, 0.08, 0.03][i];
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(peak, t0 + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 1.6 / (i + 1));
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + 1.8);
    });
  });
}

/* ---------- Toasts ---------- */
function toast(title, sub, actions = [], opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.alarm ? ' alarm' : '');
  el.innerHTML = (opts.alarm ? `<span class="app-icon ringing"><svg><use href="#bell"/></svg></span>` : '') +
    `<div class="tb">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  actions.forEach(([label, fn]) => {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => { fn(); close(); }; el.appendChild(b);
  });
  $('#toasts').appendChild(el);
  setTimeout(close, opts.ms || (actions.length ? 6000 : 3200));
  return el;
}
function withUndo(msg, mutate) {
  const snap = JSON.stringify(state.reminders);
  mutate(); commit();
  toast(msg, '', [['Deshacer', () => { state.reminders = JSON.parse(snap); commit(); }]]);
}

/* ---------- Acciones ---------- */
function completeReminder(id) {
  const r = byId(id); if (!r) return;
  withUndo(r.repeat && r.repeat !== 'none' ? 'Hecho · siguiente programado' : '¡Hecho!', () => {
    const now = Date.now();
    if (r.repeat && r.repeat !== 'none') {
      state.reminders.push({ ...r, id: uid(), done: true, doneAt: now, repeat: 'none', seriesId: r.id, calEventId: null, calSig: null, wantCal: false, inCal: false });
      let t = nextOccurrence(r, r.due);
      while (t != null && t <= now) t = nextOccurrence(r, t);
      r.due = t; r.firedAt = null; r.snoozeUntil = null;
    } else {
      r.done = true; r.doneAt = now;
    }
  });
  vibrate(12);
}
function restoreReminder(id) {
  const r = byId(id); if (!r) return;
  withUndo('Recuperado', () => { r.done = false; r.doneAt = null; r.firedAt = null; });
}
function deleteReminder(id) {
  withUndo('Eliminado', () => { state.reminders = state.reminders.filter(r => r.id !== id); });
}
function snooze(id, minutes = 10) {
  const r = byId(id); if (!r) return;
  r.snoozeUntil = Date.now() + minutes * MIN; r.firedAt = null; commit();
  toast(`Te aviso ${minutes >= 60 ? 'en ' + minutes / 60 + ' h' : 'en ' + minutes + ' min'}`, r.title);
}

/* Ventana de aviso: Hecho o «Avísame en…» */
const alarmQueue = [];
function showAlarm(r) {
  if (!alarmQueue.some(x => x.id === r.id)) alarmQueue.push(r);
  if (alarmQueue.length === 1) renderAlarm();
}
function renderAlarm() {
  const box = $('#alarm');
  const r = alarmQueue[0];
  if (!r) { box.classList.remove('show'); return; }
  const d = new Date(r.due), late = r.due < Date.now() - MIN;
  box.innerHTML = `<div class="alarm-card" style="--cat:${catColor(r.cat)}">
    <span class="app-icon big ringing"><svg><use href="#bell"/></svg></span>
    <div class="alarm-when${late ? ' late' : ''}">${dayFull(d)} · ${fmtTime(d)}${late ? ` <small>${relLabel(r.due)}</small>` : ''}</div>
    <h3>${esc(r.title)}</h3>
    ${r.notes ? `<p class="alarm-notes">${esc(r.notes)}</p>` : ''}
    <button class="btn primary alarm-done" data-al="done">${ICON.check} Hecho</button>
    <div class="alarm-later-t">Avísame en</div>
    <div class="alarm-later">
      <button class="btn" data-al="10">10 min</button><button class="btn" data-al="60">1 hora</button><button class="btn" data-al="180">3 horas</button>
    </div>
    ${alarmQueue.length > 1 ? `<div class="alarm-more">+${alarmQueue.length - 1} aviso${alarmQueue.length > 2 ? 's' : ''} más</div>` : ''}
  </div>`;
  box.classList.add('show');
}
$('#alarm').addEventListener('click', e => {
  const b = e.target.closest('[data-al]'); if (!b) return;
  const r = alarmQueue.shift();
  if (r && byId(r.id)) { if (b.dataset.al === 'done') completeReminder(r.id); else snooze(r.id, +b.dataset.al); }
  renderAlarm();
});

/* Al abrir la app: lo que tienes mañana */
function tomorrowList() {
  const t1 = addDays(startOfDay(new Date()), 1), t2 = addDays(t1, 1), out = [];
  for (const r of state.reminders) if (!r.done) for (const t of occurrencesBetween(r, +t1, +t2)) out.push({ r, at: t });
  return out.sort((x, y) => x.at - y.at);
}
function showTomorrow() {
  const list = tomorrowList();
  if (!list.length) return false;
  const t1 = addDays(startOfDay(new Date()), 1);
  const box = $('#tomorrow');
  box.innerHTML = `<div class="tm-card">
    <div class="tm-head"><span class="app-icon ringing"><svg><use href="#bell"/></svg></span>
      <div><small>Mañana, ${t1.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
      <h3>Tienes ${list.length === 1 ? 'esto' : list.length + ' cosas'}</h3></div></div>
    <div class="tm-list">${list.map((o, i) => `<div class="tm-item" style="--cat:${catColor(o.r.cat)};animation-delay:${.08 * i + .1}s">
      <span class="tm-time">${fmtTime(new Date(o.at))}</span><span class="tm-title">${esc(o.r.title)}</span></div>`).join('')}</div>
    <button class="btn primary tm-ok" data-tm="ok">Entendido</button>
  </div>`;
  box.classList.add('show'); chime(); vibrate([60, 40, 60]);
  return true;
}
$('#tomorrow').addEventListener('click', e => { if (e.target.closest('[data-tm]')) $('#tomorrow').classList.remove('show'); });
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

/* ---------- Avisos ---------- */
function triggerTime(r) { return r.snoozeUntil || (r.due - (r.alert || 0) * MIN); }
function checkAlarms() {
  const now = Date.now(); let changed = false;
  for (const r of state.reminders) {
    if (r.done || r.due == null) continue;
    const t = triggerTime(r);
    if (now >= t && r.firedAt !== t && now - t < 12 * HOUR) {
      r.firedAt = t; changed = true; fire(r);
    }
  }
  if (changed) commit();
}
function fire(r) {
  const when = r.alert && !r.snoozeUntil ? `${relLabel(r.due)}` : fmtTime(new Date(r.due));
  chime(); vibrate([80, 60, 80]);
  bellRing();
  // Insiste: si no lo marcas como hecho ni eliges cuándo, vuelve a avisar en 10 minutos
  r.snoozeUntil = Date.now() + 10 * MIN;
  showAlarm(r);
  if (state.settings.notify && 'Notification' in window && Notification.permission === 'granted') {
    const opts = { body: when + (r.notes ? '\n' + r.notes : ''), icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png', tag: r.id, data: { id: r.id }, renotify: true,
      actions: [{ action: 'done', title: 'Hecho' }, { action: 'snooze', title: 'Avísame en 10 min' }] };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification(r.title, opts)).catch(() => { });
    else try { new Notification(r.title, opts); } catch (e) { }
  }
}

/* ---------- Navegación / menú campana ---------- */
let tab = 'home';
const bellBtn = $('#bellBtn'), menu = $('#bellMenu'), menuScrim = $('#menuScrim');
function bellRing() { const ic = $('.app-icon', bellBtn); ic.classList.remove('ringing'); void ic.offsetWidth; ic.classList.add('ringing'); }
function openMenu(open) {
  const isOpen = open ?? !menu.classList.contains('open');
  menu.classList.toggle('open', isOpen); menuScrim.classList.toggle('show', isOpen);
  bellBtn.setAttribute('aria-expanded', isOpen);
  if (isOpen) { bellRing(); unlockAudio(); }
}
function setTab(t, { push = true } = {}) {
  if (!TABS[t]) t = 'home';
  if (t === 'calendar' && tab !== 'calendar') { calSel = startOfDay(new Date()); calMonth = new Date(calSel.getFullYear(), calSel.getMonth(), 1); }
  tab = t; openMenu(false);
  $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + t; });
  const v = $('#view-' + t); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  $('#tabLabel').textContent = TABS[t];
  $$('#bellMenu button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  $('#fab').hidden = t === 'settings';
  if (push) history.replaceState(null, '', t === 'home' ? location.pathname : '?tab=' + t);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
bellBtn.addEventListener('click', () => openMenu());
menuScrim.addEventListener('click', () => openMenu(false));
$$('#bellMenu button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

/* ---------- Tema ---------- */
// Auto: oscuro de 19:00 a 8:00, claro de 8:00 a 19:00
const isNightNow = () => { const h = new Date().getHours(); return h >= 19 || h < 8; };
function applyTheme() {
  const t = state.settings.theme === 'auto' ? (isNightNow() ? 'dark' : 'light') : state.settings.theme;
  if (document.documentElement.dataset.theme === t) return;
  document.documentElement.dataset.theme = t;
  $('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0B1220' : '#FBF7F1');
}
setInterval(applyTheme, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) applyTheme(); });
$('#themeBtn')?.addEventListener('click', () => {
  state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(); commit();
});

/* ---------- Búsqueda ---------- */
let query = '';
$('#searchBtn').addEventListener('click', () => toggleSearch(true));
$('#searchClose').addEventListener('click', () => toggleSearch(false));
$('#searchInput').addEventListener('input', e => { query = e.target.value.trim(); render(); });
function toggleSearch(on) {
  $('#searchBar').hidden = !on;
  if (on) { if (tab !== 'home') setTab('home'); $('#searchInput').focus(); }
  else { query = ''; $('#searchInput').value = ''; render(); }
}

/* ---------- Render: fila ---------- */
function itemHTML(r, at = r.due, { virtual = false, showDay = false } = {}) {
  const now = Date.now();
  const d = new Date(at);
  const late = !r.done && at < now;
  const soon = !late && at - now < 2 * HOUR;
  const relCls = r.done ? '' : late ? 'late' : soon ? 'soon' : '';
  let rel;
  if (r.done) rel = fmtTime(new Date(r.doneAt || at));
  else if (Math.abs(at - now) < 12 * HOUR) rel = relLabel(at, now);
  else rel = showDay ? dayLabel(d) : fmtTime(d);
  const meta = [];
  if (r.done) meta.push(`<span class="m">${ICON.clock}${dayLabel(d)} ${fmtTime(d)}</span>`);
  else if (rel !== fmtTime(d)) meta.push(`<span class="m">${ICON.clock}${fmtTime(d)}</span>`);
  if (r.repeat && r.repeat !== 'none') meta.push(`<span class="m">${ICON.repeat}${REPEAT_LABEL[r.repeat]}</span>`);
  if (r.inCal) meta.push(`<span class="m" title="En tu calendario">${ICON.cal}</span>`);
  if (r.notes) meta.push(`<span class="m">${ICON.note}</span>`);
  return `<div class="item-wrap" data-id="${r.id}">
    <div class="swipe-bg done"><span>✓ Hecho</span></div>
    <div class="item${r.done ? ' is-done' : ''}" style="--cat:${catColor(r.cat)}">
      ${virtual ? `<span class="check" style="border-style:dashed;opacity:.6"></span>` :
        `<button class="check" data-act="${r.done ? 'restore' : 'complete'}" aria-label="${r.done ? 'Recuperar' : 'Marcar como hecho'}">${ICON.check}</button>`}
      <div class="body" data-act="edit">
        <div class="title">${esc(r.title)}</div>
        <div class="meta">${meta.join('')}</div>
      </div>
      <span class="rel ${relCls}">${rel}</span>
    </div>
  </div>`;
}

/* ---------- Render: Inicio ---------- */
function greeting() {
  const h = new Date().getHours();
  const g = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  return state.settings.name ? `${g}, ${esc(state.settings.name)}` : g;
}
const pending = () => state.reminders.filter(r => !r.done && r.due != null);
const sortRem = (a, b) => a.due - b.due;

function countdown(ms) {
  const a = Math.max(0, ms - Date.now());
  const d = Math.floor(a / DAY), h = Math.floor(a % DAY / HOUR), m = Math.floor(a % HOUR / MIN), s = Math.floor(a % MIN / 1000);
  if (d >= 1) return `${d} d ${h} h`;
  if (h >= 1) return `${h} h ${pad(m)} min`;
  return `${pad(m)}:${pad(s)}`;
}

let homeFilter = 'next';
// Lo que ya ha pasado desde que creaste el recordatorio (o desde la repetición anterior)
function heroProgress(r) {
  const per = { daily: DAY, weekdays: DAY, weekly: 7 * DAY, monthly: 30 * DAY, yearly: 365 * DAY }[r.repeat] || 30 * DAY;
  const start = Math.max(r.createdAt || r.due - 7 * DAY, r.due - per);
  return Math.round(Math.min(1, Math.max(.04, (Date.now() - start) / Math.max(1, r.due - start))) * 100);
}
function renderHome() {
  const v = $('#view-home');
  const now = Date.now(), today0 = +startOfDay(new Date()), tomorrow0 = +addDays(startOfDay(new Date()), 1);
  let list = pending().sort((a, b) => a.due - b.due);

  if (query) {
    const q = deacc(query);
    const hits = state.reminders.filter(r => deacc(r.title + ' ' + (r.notes || '')).includes(q)).sort((a, b) => (a.done - b.done) || a.due - b.due);
    v.innerHTML = `<div class="group"><div class="group-title">Resultados</div>
      <div class="list">${hits.map(r => itemHTML(r, r.due, { showDay: true })).join('') || `<p class="empty" style="padding:20px;color:var(--muted)">Nada con «${esc(query)}»</p>`}</div></div>`;
    return;
  }

  const overdue = list.filter(r => r.due < now);
  const upcoming = list.filter(r => r.due >= now);
  const next = upcoming[0];
  // Hoy · semana natural (lunes a domingo) · mes natural, contando también las repeticiones
  const countIn = (s, e) => state.reminders.reduce((n, r) => n + (r.done ? 0 : occurrencesBetween(r, +s, +e).length), 0);
  const t0 = startOfDay(new Date()), w0 = addDays(t0, -((t0.getDay() + 6) % 7));
  const weekCount = countIn(w0, addDays(w0, 7));
  const monthCount = countIn(new Date(t0.getFullYear(), t0.getMonth(), 1), new Date(t0.getFullYear(), t0.getMonth() + 1, 1));

  let hero;
  if (next) {
    const nd = new Date(next.due);
    hero = `<div class="hero hero2" data-id="${next.id}" data-act="edit">
      <div class="cal-leaf"><i>${nd.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '').toUpperCase()}</i><b>${nd.getDate()}</b><small>${nd.toLocaleDateString('es-ES', { month: 'long' })}</small></div>
      <div class="hero-info">
        <div class="hero-title">${esc(next.title)}</div>
        <div class="hero-time">${fmtTime(nd)}${next.repeat && next.repeat !== 'none' ? `<small>${REPEAT_LABEL[next.repeat]}</small>` : ''}</div>
        <div class="hero-left"><span>Faltan <b id="heroCount">${countdown(next.due)}</b></span><span class="hero-bar"><i id="heroBar" style="width:${heroProgress(next)}%"></i></span></div>
      </div>
    </div>`;
  } else {
    hero = `<div class="hero calm">
      <svg class="hero-bell" viewBox="0 0 512 512"><use href="#bell"/></svg>
      <div class="eyebrow">${overdue.length ? 'Pendiente' : 'Todo en calma'}</div>
      <h2>${overdue.length ? `Tienes ${overdue.length} atrasado${overdue.length > 1 ? 's' : ''}` : 'Nada a la vista'}</h2>
      <div class="when">${overdue.length ? 'Táchalos o desliza para posponer.' : 'Pulsa + y escríbelo como lo dirías.'}</div>
    </div>`;
  }

  let groups = [
    ['Atrasados', overdue, 'overdue'],
    ['Hoy', upcoming.filter(r => r.due < tomorrow0)],
    ['Mañana', upcoming.filter(r => r.due >= tomorrow0 && r.due < tomorrow0 + DAY)],
    ['Próximos 7 días', upcoming.filter(r => r.due >= tomorrow0 + DAY && r.due < now + 7 * DAY)],
  ].filter(g => g[1].length).map(([t, arr, cls]) => [t, arr.sort(sortRem).map(r => ({ r, at: r.due,
      showDay: !['Hoy', 'Mañana', 'Atrasados'].includes(t) || (t === 'Atrasados' && !sameDay(new Date(r.due), new Date())) })), cls]);

  if (homeFilter !== 'next') {
    const s = homeFilter === 'week' ? w0 : new Date(t0.getFullYear(), t0.getMonth(), 1);
    const e = homeFilter === 'week' ? addDays(w0, 7) : new Date(t0.getFullYear(), t0.getMonth() + 1, 1);
    const map = new Map();
    for (const r of state.reminders) {
      if (r.done) continue;
      for (const t of occurrencesBetween(r, +s, +e)) {
        const k = ymd(new Date(t)); if (!map.has(k)) map.set(k, []);
        map.get(k).push({ r, at: t, virtual: t !== r.due });
      }
    }
    groups = [...map.entries()].sort((x, y) => x[0] < y[0] ? -1 : 1)
      .map(([k, arr]) => [dayFull(new Date(k + 'T12:00')), arr.sort((p, q) => p.at - q.at), new Date(k + 'T23:59') < new Date() ? 'overdue' : '']);
  }

  const lists = groups.length ? groups.map(([t, arr, cls]) => `
    <div class="group"><div class="group-title ${cls || ''}">${t}</div>
    <div class="list">${arr.map(o => itemHTML(o.r, o.at, { showDay: o.showDay, virtual: o.virtual })).join('')}</div></div>`).join('')
    : homeFilter !== 'next' ? `<p class="empty-mini">Nada ${homeFilter === 'week' ? 'esta semana' : 'este mes'}.</p>`
    : list.length ? `<p class="empty-mini">Nada en los próximos 7 días.</p>`
    : `<div class="empty">
        <span class="app-icon"><svg><use href="#bell"/></svg></span>
        <h3>Tu lista está vacía</h3>
        <p>Pulsa <b>+</b> y escríbelo como lo dirías. Reminder entiende la fecha y la hora.</p>
        <div class="try">
          <button data-try="Llamar al dentista mañana a las 10">«Llamar al dentista mañana a las 10»</button>
          <button data-try="Pagar el alquiler el 1 cada mes">«Pagar el alquiler el 1 cada mes»</button>
          <button data-try="Sacar la basura cada martes a las 9 de la noche">«Sacar la basura cada martes a las 9 de la noche»</button>
        </div>
      </div>`;

  v.innerHTML = `<div class="home-layout">
    <div class="home-side">
      <div class="greet"><h1>${greeting()}</h1><p>${fmtLong(new Date())}</p></div>
      ${hero}
      <div class="stats">
        <button class="stat${homeFilter === 'next' ? ' on' : ''}" data-hf="next"><b>${overdue.length + upcoming.filter(r => r.due < now + 7 * DAY).length}</b><span>Lo próximo</span></button>
        <button class="stat${homeFilter === 'week' ? ' on' : ''}" data-hf="week"><b>${weekCount}</b><span>Semanal</span></button>
        <button class="stat${homeFilter === 'month' ? ' on' : ''}" data-hf="month"><b>${monthCount}</b><span>Mensual</span></button>
      </div>
    </div>
    <div class="home-main${homeFilter !== 'next' ? ' scroll' : ''}">${lists}</div>
  </div>`;
  requestAnimationFrame(fitHome);
}
// Muestra solo los recordatorios que caben en pantalla sin desplazar
function fitHome() {
  // El título de la tarjeta en una sola línea: reduce la letra hasta que quepa
  const main = $('#view-home .home-main');
  if (!main || query || $('#app').hidden) return;
  const fabTop = window.innerHeight - 12;
  if (homeFilter !== 'next') { main.style.maxHeight = Math.max(160, fabTop - 10 - main.getBoundingClientRect().top) + 'px'; return; }
  main.style.maxHeight = '';
  const wraps = $$('.item-wrap', main);
  // Cabe hasta justo encima del botón +; lo demás está en la pestaña Recordatorios
  const limit = window.innerHeight - 12;
  const bottoms = wraps.map(w => w.getBoundingClientRect().bottom + window.scrollY);
  let cut = false;
  wraps.forEach((w, i) => { if (cut || (i >= 1 && bottoms[i] > limit)) { w.hidden = true; cut = true; } });
  $$('.group', main).forEach(g => { if (!$$('.item-wrap:not([hidden])', g).length) g.hidden = true; });
}

/* ---------- Render: Recordatorios (todos, con filtro) ---------- */
let listMode = 'week', listAnchor = startOfDay(new Date());
function listRange() {
  const a0 = startOfDay(listAnchor);
  if (listMode === 'day') return [a0, addDays(a0, 1)];
  if (listMode === 'week') { const s = addDays(a0, -((a0.getDay() + 6) % 7)); return [s, addDays(s, 7)]; }
  if (listMode === 'month') return [new Date(a0.getFullYear(), a0.getMonth(), 1), new Date(a0.getFullYear(), a0.getMonth() + 1, 1)];
  return null;
}
function listLabel([s, e]) {
  if (listMode === 'day') return sameDay(s, new Date()) ? 'Hoy' : fmtLong(s);
  if (listMode === 'week') {
    const last = addDays(e, -1);
    const f = d => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
    return `${f(s)} – ${f(last)}`;
  }
  return cap(s.toLocaleDateString('es-ES', { month: 'long' })) + ' ' + s.getFullYear();
}
function renderList() {
  const v = $('#view-list');
  const now = Date.now();
  const modes = [['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['all', 'Todos']];
  const range = listRange();
  let groups = [], total = 0;
  if (range) {
    const [s, e] = range;
    const map = new Map();
    for (const r of state.reminders) {
      if (r.done) continue;
      for (const t of occurrencesBetween(r, +s, +e)) {
        const k = ymd(new Date(t)); if (!map.has(k)) map.set(k, []);
        map.get(k).push({ r, at: t, virtual: t !== r.due }); total++;
      }
    }
    groups = [...map.entries()].sort((x, y) => x[0] < y[0] ? -1 : 1).map(([k, arr]) => {
      const d = new Date(k + 'T12:00');
      const label = listMode === 'day' ? '' : (['Hoy', 'Mañana', 'Ayer'].includes(dayLabel(d)) ? dayLabel(d) + ' · ' : '') + fmtLong(d);
      return [label, arr.sort((p, q) => p.at - q.at), ''];
    });
  } else {
    const list = pending().sort((x, y) => x.due - y.due);
    total = list.length;
    const over = list.filter(r => r.due < now);
    if (over.length) groups.push(['Atrasados', over.map(r => ({ r, at: r.due })), 'overdue']);
    const byMonth = new Map();
    list.filter(r => r.due >= now).forEach(r => {
      const d = new Date(r.due), k = cap(d.toLocaleDateString('es-ES', { month: 'long' })) + ' ' + d.getFullYear();
      if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push({ r, at: r.due });
    });
    groups.push(...[...byMonth].map(([k, arr]) => [k, arr, '']));
  }
  const showDay = listMode === 'all';
  v.innerHTML = `
    <div class="greet"><h1>Recordatorios</h1><p>${total ? `${total} pendiente${total > 1 ? 's' : ''}` : 'Nada pendiente aquí'}</p></div>
    <div class="list-tools">
      <div class="seg wide">${modes.map(([m, l]) => `<button data-lmode="${m}" class="${listMode === m ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${range ? `<div class="period">
        <button class="icon-btn" data-lnav="-1" aria-label="Anterior">${ICON.left}</button>
        <button class="period-label" data-lnav="0">${listLabel(range)}</button>
        <button class="icon-btn" data-lnav="1" aria-label="Siguiente">${ICON.right}</button>
      </div>` : ''}
    </div>
    ${groups.length ? groups.map(([t, arr, cls]) => `<div class="group">${t ? `<div class="group-title ${cls}">${t}</div>` : ''}
      <div class="list">${arr.map(o => itemHTML(o.r, o.at, { virtual: o.virtual, showDay })).join('')}</div></div>`).join('')
      : `<div class="empty" style="padding:28px 20px"><p>${range ? 'Sin recordatorios en este periodo.' : 'No tienes recordatorios pendientes.'}</p>
         <button class="add-day" data-lnew style="max-width:320px;margin:0 auto">${ICON.plus} Añadir uno</button></div>`}`;
}

/* ---------- Render: Calendario ---------- */
let calMonth = startOfDay(new Date()); calMonth.setDate(1);
let calSel = startOfDay(new Date());

function occMap(start, end) {
  const map = new Map();
  for (const r of state.reminders) {
    for (const t of occurrencesBetween(r, +start, +end)) {
      const k = ymd(new Date(t));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({ r, at: t, virtual: !r.done && t !== r.due });
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.at - b.at);
  return map;
}
function renderCalendar() {
  const v = $('#view-calendar');
  const y = calMonth.getFullYear(), mo = calMonth.getMonth();
  const offset = (calMonth.getDay() + 6) % 7;
  const gridStart = addDays(calMonth, -offset), gridEnd = addDays(gridStart, 42);
  const map = occMap(gridStart, gridEnd);
  const today = new Date();
  let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i), k = ymd(d), occ = map.get(k) || [];
    // Anillo con el color de la categoría; si hay varias, se reparte en segmentos
    const cols = [...new Set(occ.map(o => o.r.done ? 'var(--faint)' : catColor(o.r.cat)))].slice(0, 4);
    const ring = cols.length === 1 ? cols[0]
      : cols.length ? 'conic-gradient(' + cols.map((c, i) => `${c} ${i * 360 / cols.length + 4}deg ${(i + 1) * 360 / cols.length - 4}deg, transparent 0 ${(i + 1) * 360 / cols.length + 4}deg`).join(', ') + ')' : '';
    cells += `<button class="day${d.getMonth() !== mo ? ' other' : ''}${sameDay(d, today) ? ' today' : ''}${sameDay(d, calSel) ? ' sel' : ''}${occ.length ? ' has' : ''}" data-day="${k}"${ring ? ` style="--ring:${ring}"` : ''} aria-label="${fmtLong(d)}${occ.length ? ', ' + occ.length + ' recordatorios' : ''}">
      <span class="num"><b>${d.getDate()}</b></span></button>`;
  }
  const selOcc = map.get(ymd(calSel)) || occMap(startOfDay(calSel), addDays(startOfDay(calSel), 1)).get(ymd(calSel)) || [];
  const monthName = cap(calMonth.toLocaleDateString('es-ES', { month: 'long' })) + ' ' + calMonth.getFullYear();
  v.innerHTML = `<div class="cal-layout">
    <div class="cal-card" id="calCard">
      <div class="cal-head">
        <h2>${monthName}</h2>
        <div class="nav">
          <button class="pill-btn" data-cal="today">Hoy</button>
          <button class="icon-btn" data-cal="prev" aria-label="Mes anterior">${ICON.left}</button>
          <button class="icon-btn" data-cal="next" aria-label="Mes siguiente">${ICON.right}</button>
        </div>
      </div>
      <div class="cal-grid">${cells}</div>
    </div>
    <div class="day-panel">
      <h3>${sameDay(calSel, today) ? 'Hoy, ' + calSel.getDate() : fmtLong(calSel)}</h3>
      <p class="sub">${selOcc.length ? `${selOcc.length} recordatorio${selOcc.length > 1 ? 's' : ''}` : 'Día libre'}</p>
      <div class="list">${selOcc.map(o => itemHTML(o.r, o.at, { virtual: o.virtual })).join('')}</div>
      <button class="add-day" data-cal="add">${ICON.plus} Añadir en este día</button>
    </div>
  </div>`;
}

/* ---------- Render: Hecho ---------- */
function renderDone() {
  const v = $('#view-done');
  const done = state.reminders.filter(r => r.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const today0 = startOfDay(new Date());
  const perDay = [];
  for (let i = 6; i >= 0; i--) {
    const d0 = addDays(today0, -i), d1 = addDays(d0, 1);
    perDay.push({ d: d0, n: done.filter(r => r.doneAt >= +d0 && r.doneAt < +d1).length });
  }
  const max = Math.max(1, ...perDay.map(p => p.n));
  const week = perDay.reduce((s, p) => s + p.n, 0);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d0 = addDays(today0, -i), d1 = addDays(d0, 1);
    const n = done.some(r => r.doneAt >= +d0 && r.doneAt < +d1);
    if (n) streak++; else if (i > 0) break;
  }
  const groups = new Map();
  done.forEach(r => { const k = ymd(new Date(r.doneAt || r.due)); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
  v.innerHTML = `
    <div class="greet"><h1>Lo que ya tachaste</h1><p>${week ? 'Buen ritmo esta semana.' : 'Aquí irá todo lo que completes.'}</p></div>
    <div class="done-hero">
      <div class="stat"><b>${week}</b><span>Esta semana</span></div>
      <div class="stat"><b>${streak}</b><span>Días seguidos</span></div>
      <div class="stat"><b>${done.length}</b><span>En total</span></div>
    </div>
    <div class="week-bars" aria-label="Completados por día">${perDay.map(p => `<div class="bar${p.n ? '' : ' zero'}" title="${p.n}"><i style="height:${Math.max(6, p.n / max * 100)}%"></i><span>${p.d.toLocaleDateString('es-ES', { weekday: 'narrow' })}</span></div>`).join('')}</div>
    ${[...groups].map(([k, arr]) => `<div class="group"><div class="group-title">${dayLabel(new Date(k + 'T12:00'))}</div><div class="list">${arr.map(r => itemHTML(r)).join('')}</div></div>`).join('')}
    ${done.length ? `<div style="text-align:center;margin-top:10px"><button class="btn ghost" data-set="clearDone">Vaciar historial</button></div>` : ''}`;
}

/* ---------- Render: Ajustes ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (tab === 'settings') render(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderSettings() {
  const s = state.settings;
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-seg="${key}" data-v="${v}" class="${s[key] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const tog = (key, title, sub) => `<label class="toggle-row"><span class="rl"><b>${title}</b><small>${sub}</small></span><input type="checkbox" data-tog="${key}" ${s[key] ? 'checked' : ''}><i class="switch"></i></label>`;
  const notifSupported = 'Notification' in window;
  const perm = notifSupported ? Notification.permission : 'unsupported';
  let installRow = '';
  if (!isStandalone()) {
    if (installEvt) installRow = `<div class="row"><span class="rl"><b>Instalar Reminder</b><small>Como una app, con su icono</small></span><button class="btn primary" data-set="install">Instalar</button></div>`;
    else if (isIOS) installRow = `<div class="row"><span class="rl"><b>Instalar en iPhone</b><small>Pulsa Compartir ⎋ y luego «Añadir a pantalla de inicio»</small></span></div>`;
    else installRow = `<div class="row"><span class="rl"><b>Instalar</b><small>En el menú del navegador: «Instalar app» o «Añadir a pantalla de inicio»</small></span></div>`;
  } else installRow = `<div class="row"><span class="rl"><b>App instalada</b><small>Estás usando Reminder como app</small></span><span style="color:var(--c-casa)">${ICON.check}</span></div>`;

  $('#view-settings').innerHTML = `<div class="settings">
    <h1>Ajustes</h1>
    <div class="card">
      <h4>Tú</h4>
      <div class="row"><span class="rl"><b>Tu nombre</b><small>Para el saludo</small></span><input type="text" data-input="name" value="${esc(s.name)}" placeholder="Opcional" maxlength="24"></div>
      <div class="row"><span class="rl"><b>Apariencia</b></span>${seg('theme', [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Oscuro']])}</div>
    </div>
    ${cloud.settingsCard()}
    <div class="card">
      <h4>Calendario</h4>
      ${cloud.connected() ? `<div class="row"><span class="rl"><b>Google Calendar</b><small>Conectado: los recordatorios se crean, cambian y borran solos, con su aviso</small></span><span style="color:var(--c-casa)">${ICON.check}</span></div>
      ${tog('autoCal', 'Añadir siempre a Google Calendar', 'Activado por defecto en cada recordatorio nuevo')}
      <div class="row"><span class="rl"><b>Pendientes antiguos</b><small>Envía al calendario los que aún no están</small></span><button class="btn" data-set="calAll">Añadir</button></div>`
      : `<div class="row" style="flex-wrap:wrap"><span class="rl"><b>Mi calendario</b><small>Dónde se añaden tus recordatorios</small></span>${seg('calProvider', [['google', 'Google'], ['apple', 'Apple'], ['outlook', 'Outlook']])}</div>
      ${tog('autoCal', 'Añadir siempre a mi calendario', 'Cada nuevo recordatorio se envía al guardarlo')}`}
    </div>
    <div class="card">
      <h4>Avisos</h4>
      ${notifSupported ? tog('notify', 'Notificaciones', perm === 'denied' ? 'Bloqueadas en el navegador: actívalas en los permisos del sitio' : 'Aviso del sistema cuando llegue la hora') : `<div class="row"><span class="rl"><b>Notificaciones</b><small>Este navegador no las admite${isIOS ? '. En iPhone, instala la app primero' : ''}</small></span></div>`}
      ${tog('sound', 'Sonido de campana', 'Un pequeño «ding» al avisar')}
      <div class="row"><span class="rl"><b>Probar aviso</b><small>Para ver y oír cómo suena</small></span><button class="btn" data-set="test">Probar</button></div>
      <div class="row"><span class="rl"><small>Los avisos de la web suenan con Reminder abierta o en segundo plano. Para que te avise con todo cerrado, activa «Añadir a mi calendario»: tu calendario hará de despertador.</small></span></div>
    </div>
    <div class="card">
      <h4>App y datos</h4>
      ${installRow}
      <div class="row"><span class="rl"><b>Copia de seguridad</b><small>Archivo JSON: guárdala o pásala a otro dispositivo</small></span><span style="display:flex;gap:8px"><button class="btn" data-set="export">Exportar</button><button class="btn" data-set="import">Importar</button></span></div>
      <div class="row"><span class="rl"><b>En texto</b><small>El código de tus datos para copiar y pegar</small></span><span style="display:flex;gap:8px"><button class="btn" data-set="txtOut">Exportar</button><button class="btn" data-set="txtIn">Importar</button></span></div>
      <div class="row"><span class="rl"><b>Borrar todo</b><small>Elimina todos los recordatorios de este dispositivo</small></span><button class="btn danger" data-set="wipe">Borrar</button></div>
    </div>
    <div class="foot"><span class="app-icon"><svg><use href="#bell"/></svg></span>Reminder 1.0 · Tus datos se guardan en este dispositivo</div>
  </div>`;
}

/* ---------- Render global ---------- */
let heroTimer;
function lockHome() {
  const lock = tab === 'home' && !query && !document.body.classList.contains('sheet-open');
  document.documentElement.classList.toggle('lock', lock);
  if (lock && window.scrollY) window.scrollTo(0, 0);
}
function render() {
  lockHome();
  if (tab === 'home') renderHome();
  else if (tab === 'calendar') renderCalendar();
  else if (tab === 'list') renderList();
  else if (tab === 'done') renderDone();
  else renderSettings();
  updateBadges();
}
function updateBadges() {
  const now = Date.now(), tom = +addDays(startOfDay(new Date()), 1);
  const p = pending();
  const urgent = p.filter(r => r.due < tom).length;
  const b = $('#bellBadge');
  b.hidden = !urgent; b.textContent = urgent;
  $('[data-count="home"]').textContent = p.length || '';
  $('[data-count="calendar"]').textContent = p.filter(r => r.due >= now && r.due < now + 30 * DAY).length || '';
  $('[data-count="list"]').textContent = p.length || '';
  $('[data-count="done"]').textContent = state.reminders.filter(r => r.done).length || '';
  document.title = urgent ? `(${urgent}) Reminder` : 'Reminder';
  try { if ('setAppBadge' in navigator) urgent ? navigator.setAppBadge(urgent) : navigator.clearAppBadge(); } catch (e) { }
  $('#fab').classList.toggle('pulse', !state.reminders.length);
}
function tick() {
  const el = $('#heroCount');
  if (el && tab === 'home') {
    const n = pending().filter(r => r.due >= Date.now()).sort((a, b) => a.due - b.due)[0];
    const heroId = $('.hero[data-id]')?.dataset.id;
    if (!n || n.id !== heroId) render(); else { el.textContent = countdown(n.due); const bar = $('#heroBar'); if (bar) bar.style.width = heroProgress(n) + '%'; }
  }
}

/* ---------- Delegación de eventos en vistas ---------- */
let suppressClick = false;
$('#views').addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  const t = e.target;
  const act = t.closest('[data-act]');
  if (act) {
    const id = act.closest('[data-id]')?.dataset.id;
    const a = act.dataset.act;
    if (a === 'complete') {
      const item = act.closest('.item'); item?.classList.add('completing');
      setTimeout(() => completeReminder(id), 260);
    } else if (a === 'restore') restoreReminder(id);
    else if (a === 'edit' && id) openSheet({ id });
    return;
  }
  const hf = t.closest('[data-hf]');
  if (hf) { homeFilter = hf.dataset.hf; renderHome(); return; }
  const go = t.closest('[data-goto]');
  if (go) { if (go.dataset.goto === 'list') listMode = 'all'; setTab(go.dataset.goto); return; }
  const lm = t.closest('[data-lmode]');
  if (lm) { listMode = lm.dataset.lmode; renderList(); return; }
  const ln = t.closest('[data-lnav]');
  if (ln) {
    const n = +ln.dataset.lnav, x = new Date(listAnchor);
    if (n === 0) listAnchor = startOfDay(new Date());
    else if (listMode === 'day') listAnchor = addDays(x, n);
    else if (listMode === 'week') listAnchor = addDays(x, 7 * n);
    else listAnchor = new Date(x.getFullYear(), x.getMonth() + n, 1);
    renderList(); return;
  }
  if (t.closest('[data-lnew]')) { openSheet(listMode === 'day' ? { date: listAnchor } : {}); return; }
  const tr = t.closest('[data-try]');
  if (tr) { openSheet({ text: tr.dataset.try }); return; }
  const day = t.closest('[data-day]');
  if (day) {
    const [y, m, d] = day.dataset.day.split('-').map(Number);
    calSel = new Date(y, m - 1, d);
    if (calSel.getMonth() !== calMonth.getMonth()) calMonth = new Date(y, m - 1, 1);
    renderCalendar(); return;
  }
  const cal = t.closest('[data-cal]');
  if (cal) {
    const c = cal.dataset.cal;
    if (c === 'prev') calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    else if (c === 'next') calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    else if (c === 'today') { calSel = startOfDay(new Date()); calMonth = new Date(calSel.getFullYear(), calSel.getMonth(), 1); }
    else if (c === 'add') { openSheet({ date: calSel }); return; }
    renderCalendar(); return;
  }
  const seg = t.closest('[data-seg]');
  if (seg) {
    state.settings[seg.dataset.seg] = seg.dataset.v;
    if (seg.dataset.seg === 'theme') applyTheme();
    commit(); return;
  }
  const set = t.closest('[data-set]');
  if (set) settingsAction(set.dataset.set);
});
$('#views').addEventListener('change', async e => {
  const k = e.target.dataset.tog;
  if (k) {
    if (k === 'notify' && e.target.checked) {
      unlockAudio();
      let p = Notification.permission;
      if (p === 'default') p = await Notification.requestPermission();
      if (p !== 'granted') { e.target.checked = false; toast('Permiso no concedido', 'Puedes activarlo en los ajustes del sitio del navegador.'); }
      state.settings.notify = p === 'granted';
    } else state.settings[k] = e.target.checked;
    commit();
  }
  const inp = e.target.dataset.input;
  if (inp) { state.settings[inp] = e.target.value.trim(); save(); }
});

function settingsAction(a) {
  if (a === 'test') {
    unlockAudio();
    fire({ id: 'test', title: 'Así suena Reminder', notes: '', due: Date.now(), alert: 0 });
  } else if (a === 'exportIcs') {
    const list = pending();
    if (!list.length) return toast('No hay pendientes que exportar');
    download('reminder.ics', icsFile(list), 'text/calendar');
  } else if (a === 'export') {
    exportJSON();
  } else if (a === 'import') {
    $('#importFile').accept = 'application/json,.json'; $('#importFile').click();
  } else if (a === 'txtOut') {
    openText('out');
  } else if (a === 'txtIn') {
    openText('in');
  } else if (a === 'wipe') {
    if (confirm('¿Borrar todos los recordatorios de este dispositivo? No se puede deshacer.')) { state.reminders = []; commit(); toast('Todo borrado'); }
  } else if (a === 'clearDone') {
    withUndo('Historial vaciado', () => { state.reminders = state.reminders.filter(r => !r.done); });
  } else if (a === 'gConnect') {
    cloud.signIn(false);
  } else if (a === 'gSync') {
    cloud.sync(true);
  } else if (a === 'gDisconnect') {
    if (confirm('¿Desconectar tu cuenta de Google? Tus recordatorios se quedan en este dispositivo.')) cloud.signOut();
  } else if (a === 'calAll') {
    let n = 0;
    state.reminders.forEach(r => { if (!r.done && !r.wantCal && !r.calEventId && !r.inCal) { r.wantCal = true; n++; } });
    commit(); toast(n ? `Enviando ${n} a Google Calendar` : 'Ya estaban todos');
  } else if (a === 'install' && installEvt) {
    installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); });
  }
}
/* ---------- Guardado 💾: exportar / importar (JSON y texto) ---------- */
const REP_TXT = { none: 'Nunca', daily: 'Cada día', weekdays: 'Laborables', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };
const ALERT_TXT = { 0: 'A la hora', 5: '5 min antes', 15: '15 min antes', 30: '30 min antes', 60: '1 hora antes', 1440: '1 día antes' };
const dmy = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
function exportJSON() {
  const data = { app: 'Reminder', v: 1, exportado: new Date().toISOString(), reminders: state.reminders, tombstones: state.tombstones };
  download(`reminder-${ymd(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('Copia JSON descargada', `${state.reminders.length} recordatorios`);
}
function buildTXT() {
  const list = [...state.reminders].sort((x, y) => (x.done - y.done) || x.due - y.due);
  const line = r => { const d = new Date(r.due);
    return [dmy(d), hm(d), r.title, CATS.find(c => c.id === r.cat)?.name || 'Otros', REP_TXT[r.repeat || 'none'], ALERT_TXT[r.alert || 0] || (r.alert + ' min antes'), (r.notes || '').replace(/[\n|]/g, ' '), r.done ? 'hecho' : 'pendiente'].join(' | '); };
  const txt = [
    `REMINDER — copia del ${dmy(new Date())}`,
    `# fecha | hora | título | categoría | repetir | aviso | notas | estado`,
    `# Para importar también vale escribir una línea natural: «Llamar al dentista el 5/11 a las 10»`,
    '', ...list.map(line), '',
  ].join('\n');
  return txt;
}
function importJSON(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.reminders;
  if (!Array.isArray(arr)) throw new Error('formato');
  const ids = new Set(state.reminders.map(r => r.id));
  const added = arr.filter(r => r && r.title && r.due && !ids.has(r.id)).map(r => ({ ...r, id: r.id || uid(), calEventId: null, calSig: null, inCal: false, wantCal: !!state.settings.autoCal && !r.done && r.due > Date.now() }));
  state.reminders.push(...added);
  return { added: added.length, skipped: arr.length - added.length, bad: [] };
}
function importTXT(text) {
  const catId = n => { const c = CATS.find(c => deacc(c.name) === deacc((n || '').trim())); return c ? c.id : null; };
  const repId = n => Object.keys(REP_TXT).find(k => deacc(REP_TXT[k]) === deacc((n || '').trim())) || 'none';
  const alertMin = n => { const k = Object.keys(ALERT_TXT).find(k => deacc(ALERT_TXT[k]) === deacc((n || '').trim())); return k ? +k : 0; };
  const existing = new Set(state.reminders.map(r => deacc(r.title) + '|' + r.due));
  let added = 0, dup = 0; const bad = [];
  for (let raw of text.split(/\r?\n/)) {
    const ln = raw.trim();
    if (!ln || ln.startsWith('#') || /^REMINDER\b/i.test(ln)) continue;
    let r = null;
    const parts = ln.split('|').map(s => s.trim());
    const dm = parts[0] && parts[0].match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    const tm = parts[1] && parts[1].match(/^(\d{1,2})[:.h](\d{2})$/);
    if (parts.length >= 3 && dm && tm && parts[2]) {
      let y = +dm[3]; if (y < 100) y += 2000;
      const due = +new Date(y, +dm[2] - 1, +dm[1], +tm[1], +tm[2]);
      const done = /hecho/i.test(parts[7] || '');
      r = { title: parts[2], due, cat: catId(parts[3]) || guessCat(parts[2]) || 'personal', repeat: repId(parts[4]), alert: alertMin(parts[5]), notes: parts[6] || '', done, doneAt: done ? Date.now() : null };
    } else {
      const p = parseNL(ln.replace(/^[-•*]\s*/, ''));
      if (p.date && p.time && p.title) {
        const due = +fromParts(ymd(p.date), p.time);
        r = { title: p.title, due, cat: guessCat(p.title) || 'personal', repeat: p.repeat || 'none', alert: 0, notes: '', done: false, doneAt: null };
      }
    }
    if (!r) { bad.push(ln); continue; }
    const key = deacc(r.title) + '|' + r.due;
    if (existing.has(key)) { dup++; continue; }
    existing.add(key);
    state.reminders.push({ id: uid(), createdAt: Date.now(), firedAt: r.due < Date.now() ? r.due : null, snoozeUntil: null, inCal: false,
      wantCal: !!state.settings.autoCal && !r.done && r.due > Date.now(), anchorDay: new Date(r.due).getDate(), priority: false, ...r });
    added++;
  }
  return { added, skipped: dup, bad };
}
function doImport(kind, text) {
  let res;
  try { res = kind === 'json' ? importJSON(text) : importTXT(text); }
  catch (e) { toast('Archivo no válido', kind === 'json' ? 'No es un JSON de Reminder.' : 'No he entendido el texto.'); return; }
  commit();
  const out = $('#saveResult');
  out.hidden = false;
  out.className = 'save-result' + (res.bad.length && !res.added ? ' warn' : '');
  out.innerHTML = `<b>${res.added} importado${res.added === 1 ? '' : 's'}</b>${res.skipped ? ` · ${res.skipped} ya estaba${res.skipped === 1 ? '' : 'n'}` : ''}` +
    (res.bad.length ? `<br><span>No entendí ${res.bad.length} línea${res.bad.length > 1 ? 's' : ''} (le falta el día o la hora):</span><ul>${res.bad.slice(0, 5).map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '');
  if (res.added) toast(`Importados ${res.added} recordatorios`);
}
let importKind = 'json';
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  doImport(/\.json$/i.test(file.name) || /^\s*[\[{]/.test(text) ? 'json' : 'txt', text);
  e.target.value = '';
});
function openText(mode) {
  const out = mode === 'out';
  $('#saveBox').innerHTML = `<div class="save-card">
    <div class="save-head"><div><h3>${out ? 'Exportar código' : 'Importar código'}</h3>
      <small>${out ? 'Cópialo y guárdalo donde quieras' : 'Pega aquí el código que exportaste'}</small></div>
      <button class="icon-btn" data-sv="close" aria-label="Cerrar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <textarea id="pasteTxt" class="txt-box" rows="10" spellcheck="false" ${out ? 'readonly' : ''} placeholder='{"app":"Reminder","reminders":[ … ]}'></textarea>
    ${out ? `<button class="btn primary txt-act" data-sv="copy">Copiar código</button>` : `<button class="btn primary txt-act" data-sv="paste">Importar</button>`}
    <div class="save-result" id="saveResult" hidden></div>
  </div>`;
  if (out) $('#pasteTxt').value = JSON.stringify({ app: 'Reminder', v: 1, exportado: new Date().toISOString(), reminders: state.reminders, tombstones: state.tombstones }, null, 2);
  $('#saveBox').classList.add('show');
  if (!out) setTimeout(() => $('#pasteTxt').focus(), 300);
}
$('#saveBox').addEventListener('click', async e => {
  if (e.target === $('#saveBox')) { $('#saveBox').classList.remove('show'); return; }
  const b = e.target.closest('[data-sv]'); if (!b) return;
  const a = b.dataset.sv;
  if (a === 'close') $('#saveBox').classList.remove('show');
  else if (a === 'copy') {
    const ta = $('#pasteTxt');
    try { await navigator.clipboard.writeText(ta.value); }
    catch (err) { ta.removeAttribute('readonly'); ta.select(); document.execCommand('copy'); ta.setAttribute('readonly', ''); }
    b.textContent = '✓ Copiado'; setTimeout(() => { b.textContent = 'Copiar código'; }, 1800);
  }
  else if (a === 'paste') { const t = $('#pasteTxt').value.trim(); if (t) doImport(/^\s*[\[{]/.test(t) ? 'json' : 'txt', t); }
});

/* ---------- Deslizar para completar / borrar ---------- */
(() => {
  let st = null;
  $('#views').addEventListener('pointerdown', e => {
    const item = e.target.closest('.item');
    if (!item || e.target.closest('.check') || item.classList.contains('is-done') || e.button > 0) return;
    st = { item, x: e.clientX, y: e.clientY, dx: 0, drag: false, id: item.closest('[data-id]').dataset.id };
  });
  window.addEventListener('pointermove', e => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.drag) {
      if (Math.abs(dy) > 10) { st = null; return; }
      if (Math.abs(dx) > 10) { st.drag = true; st.item.classList.add('dragging'); try { st.item.setPointerCapture(e.pointerId); } catch (_) { } }
    }
    if (st.drag) {
      st.dx = dx;
      const bg = st.item.previousElementSibling;
      bg.className = 'swipe-bg ' + (dx > 0 ? 'done' : 'del');
      bg.innerHTML = dx > 0 ? '<span>✓ Hecho</span>' : '<span>Eliminar</span>';
      st.item.style.transform = `translateX(${dx}px)`;
      st.item.style.opacity = String(1 - Math.min(Math.abs(dx) / 400, .4));
    }
  });
  const end = () => {
    if (!st) return;
    const { item, dx, drag, id } = st; st = null;
    item.classList.remove('dragging');
    if (!drag) return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 50);
    if (Math.abs(dx) > 90) {
      item.style.transform = `translateX(${dx > 0 ? 120 : -120}%)`;
      setTimeout(() => dx > 0 ? completeReminder(id) : deleteReminder(id), 200);
    } else { item.style.transform = ''; item.style.opacity = ''; }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
})();

/* Deslizar el calendario para cambiar de mes */
(() => {
  let sx = null, sy = null;
  $('#views').addEventListener('touchstart', e => { if (e.target.closest('#calCard')) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  $('#views').addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + (dx < 0 ? 1 : -1), 1);
      renderCalendar();
    }
  });
})();

/* ---------- Hoja: crear / editar ---------- */
const sheet = $('#sheet'), sheetScrim = $('#sheetScrim');
const f = { title: $('#fTitle'), notes: $('#fNotes'), date: $('#fDate'), time: $('#fTime'), repeat: $('#fRepeat'), alert: $('#fAlert'), cal: $('#fCal') };
let editing = null, cat = 'personal', manual = {}, lastParse = null;

$('#catPicker').innerHTML = CATS.map(c => `<button type="button" data-cat="${c.id}" style="--c:${catColor(c.id)}"><i></i>${c.name}</button>`).join('');
$('#catPicker').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { cat = b.dataset.cat; manual.cat = true; paintCats(); } });
const paintCats = () => { $$('#catPicker button').forEach(b => b.classList.toggle('on', b.dataset.cat === cat)); const on = $('#catPicker .on'); if (on) { const p = $('#catPicker'); p.scrollTo({ left: Math.max(0, on.offsetLeft - p.clientWidth / 2 + on.offsetWidth / 2), behavior: 'smooth' }); } };

function dateChipDefs() {
  const t = startOfDay(new Date());
  const sat = addDays(t, ((6 - t.getDay() + 7) % 7) || 7);
  return [['Hoy', t], ['Mañana', addDays(t, 1)]];
}
function paintChips() {
  $('#dateChips').innerHTML = dateChipDefs().map(([l, d]) => `<button type="button" data-d="${ymd(d)}" class="${f.date.value === ymd(d) ? 'on' : ''}">${l}</button>`).join('');

}
$('#dateChips').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { f.date.value = b.dataset.d; manual.date = true; paintChips(); updateReady(); } });
$('#timeChips').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { f.time.value = b.dataset.t; manual.time = true; paintChips(); updateReady(); } });
f.date.addEventListener('input', () => { manual.date = true; paintChips(); updateReady(); });
f.time.addEventListener('input', () => { manual.time = true; paintChips(); updateReady(); });
f.repeat.addEventListener('change', () => { manual.repeat = true; });

function defaultWhen() {
  const n = new Date();
  const d = new Date(n); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
  if (d.getHours() >= 23 || d.getHours() < 7) { const t = addDays(startOfDay(n), n.getHours() >= 7 ? 1 : 0); t.setHours(9); return t; }
  return d;
}

const CAT_WORDS = [
  ['finanzas', /\b(pag(ar|o)|banco|transferencia|factura|recibo|hacienda|renta|declaraci|impuesto|iva|irpf|accion(es)?|cartera|portfolio|invers|bitcoin|btc|cripto|staking|stacking|dividend|fondo|hipoteca|seguro|tarjeta|n[oó]mina|ahorro|bolsa|myinvestor)/i],
  ['salud', /\b(m[eé]dic|doctor|dentista|cita m|pastilla|medicamento|farmacia|vacuna|an[aá]lisis|hospital|fisio|gimnasio|gym|entrenar|correr|pediatra|ginec|revisi[oó]n m)/i],
  ['trabajo', /\b(reuni[oó]n|trabajo|oficina|cliente|jefe|proyecto|entrega|informe|presentaci[oó]n|curr|paro|sepe|empresa|llamada de trabajo|email|correo)/i],
  ['casa', /\b(casa|piso|basura|limpiar|lavadora|compra|super|mercadona|alquiler|fianza|plantas|regar|luz|agua|gas|internet|fontanero|mudanza|trastero|coche|itv|taller)/i],
];
const guessCat = t => { for (const [c, re] of CAT_WORDS) if (re.test(deacc(t))) return c; return null; };

/* Para crear hacen falta tres cosas: qué, día y hora */
function missingFields() {
  const miss = [];
  if (!(f.title.value.trim())) miss.push('qué');
  if (!f.date.value) miss.push('el día');
  if (!f.time.value) miss.push('la hora');
  return miss;
}
function updateReady() {
  const miss = missingFields();
  $('#sheetSave').disabled = miss.length > 0;
  const el = $('#missing');
  el.hidden = !miss.length || (!f.title.value.trim() && miss.length === 3);
  if (miss.length) el.textContent = 'Falta ' + miss.join(' y ').replace(' y ', miss.length > 2 ? ', ' : ' y ');
  $('#fDate').classList.toggle('need', !f.date.value);
  $('#fTime').classList.toggle('need', !f.time.value);
}

function onTitleInput() {
  if (editing) return;
  const p = parseNL(f.title.value);
  lastParse = p;
  $('#nlChips').innerHTML = p.matched ? p.chips.map(c => `<span>${c}</span>`).join('') : '';
  $('#nlHint').hidden = !!f.title.value;
  if (p.date && !manual.date) f.date.value = ymd(p.date);
  if (p.time && !manual.time) f.time.value = p.time;
  if (!p.time && !manual.time) f.time.value = '';
  if (!p.date && !manual.date) f.date.value = '';
  if (!manual.repeat) f.repeat.value = p.repeat || 'none';
  if (!manual.cat) { const g = guessCat(f.title.value); if (g && g !== cat) { cat = g; paintCats(); } }
  paintChips(); updateReady();
}
f.title.addEventListener('input', onTitleInput);
f.notes.addEventListener('input', () => { f.notes.style.height = 'auto'; f.notes.style.height = Math.min(f.notes.scrollHeight, 120) + 'px'; });

function openSheet({ id, date, text } = {}) {
  unlockAudio();
  openMenu(false);
  editing = id ? byId(id) : null;
  manual = {}; lastParse = null;
  $('#nlChips').innerHTML = ''; $('#nlHint').hidden = !!editing;
  $('#sheetTitle').textContent = editing ? 'Editar' : 'Nuevo recordatorio';
  $('#editActions').hidden = !editing;
  $('#calProviderHint').textContent = cloud.connected() ? 'Google Calendar · se crea solo, con aviso' : PROVIDERS[state.settings.calProvider];
  if (editing) {
    const d = new Date(editing.due);
    f.title.value = editing.title; f.notes.value = editing.notes || '';
    f.date.value = ymd(d); f.time.value = hm(d);
    f.repeat.value = editing.repeat || 'none'; f.alert.value = String(editing.alert || 0);
    f.cal.checked = !!(editing.wantCal || editing.calEventId);
    cat = editing.cat || 'personal';
    $('#fCal').closest('.toggle-row').hidden = !cloud.connected();
    $('#btnAddCal').hidden = cloud.connected();
  } else {
    // No se inventa nada: el día y la hora los dices tú (o los eliges)
    f.date.value = date ? ymd(startOfDay(date)) : ''; f.time.value = '';
    if (date) manual.date = true;
    f.title.value = text || ''; f.notes.value = '';
    f.repeat.value = 'none'; f.alert.value = '0';
    f.cal.checked = !!state.settings.autoCal;
    cat = 'personal';
    $('#fCal').closest('.toggle-row').hidden = false;
    if (text) onTitleInput();
  }
  paintCats(); paintChips(); updateReady();
  $('#voiceStatus').hidden = true;
  document.body.classList.add('sheet-open');
  sheet.classList.add('open'); sheetScrim.classList.add('show');
  sheet.querySelector('.sheet-body').scrollTop = 0;
  setTimeout(() => { if (!editing || !matchMedia('(pointer:coarse)').matches) f.title.focus(); }, 280);
}
/* ---------- Dictado por voz ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recBase = '';
if (SR) $('#micBtn').hidden = false;
function stopMic() { try { rec && rec.stop(); } catch (e) { } }
function micUI(on) { $('#micBtn').classList.toggle('on', on); $('#micLive').hidden = !on; }
$('#micBtn').addEventListener('click', () => {
  if (!SR) return;
  if (rec) { stopMic(); return; }
  rec = new SR();
  rec.lang = 'es-ES'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  recBase = f.title.value.trim();
  rec.onresult = e => {
    let txt = '';
    for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
    txt = txt.trim();
    f.title.value = (recBase ? recBase + ' ' : '') + (txt ? txt[0].toUpperCase() + txt.slice(1) : '');
    onTitleInput();
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Sin permiso de micrófono', 'Actívalo en los ajustes del navegador para este sitio.');
    else if (e.error === 'no-speech') toast('No te he oído', 'Pulsa el micro y habla.');
    else if (e.error !== 'aborted') toast('El dictado no está disponible ahora');
  };
  rec.onend = () => {
    rec = null; micUI(false);
    if (!f.title.value.trim()) return;
    const miss = missingFields(), vs = $('#voiceStatus');
    vs.hidden = false;
    if (!miss.length) {
      vs.className = 'voice-status ok';
      const d = fromParts(f.date.value, f.time.value);
      vs.textContent = `✓ ${dayFull(d)} · ${fmtTime(d)} — creando…`;
      clearTimeout(window.__voiceSave);
      window.__voiceSave = setTimeout(() => { if (sheet.classList.contains('open') && !missingFields().length) sheet.requestSubmit(); }, 1100);
    } else {
      vs.className = 'voice-status warn';
      vs.textContent = `Falta ${miss.join(' y ')}. Pulsa el micro y dímelo, o elígelo abajo.`;
      vibrate([40, 40, 40]);
    }
  };
  try { rec.start(); micUI(true); vibrate(10); } catch (e) { rec = null; micUI(false); }
});

function closeSheet() {
  stopMic(); clearTimeout(window.__voiceSave);
  sheet.classList.remove('open'); sheetScrim.classList.remove('show');
  document.body.classList.remove('sheet-open');
  editing = null; f.title.blur();
}
$('#fab').addEventListener('click', () => sheet.classList.contains('open') ? closeSheet() : openSheet());
$('#sheetCancel').addEventListener('click', closeSheet);
sheetScrim.addEventListener('click', closeSheet);

sheet.addEventListener('submit', e => {
  e.preventDefault();
  let title = f.title.value.trim();
  if (!editing && lastParse && lastParse.matched && lastParse.title) title = lastParse.title;
  if (!title) { f.title.focus(); return; }
  if (missingFields().length) { updateReady(); toast('Falta ' + missingFields().join(' y ')); return; }
  const due = +fromParts(f.date.value, f.time.value);
  const data = {
    title, notes: f.notes.value.trim(), due,
    repeat: f.repeat.value, alert: +f.alert.value, cat, priority: false,
    anchorDay: new Date(due).getDate(),
  };
  let r;
  if (editing) {
    r = editing;
    const changedTime = r.due !== due || r.alert !== data.alert;
    Object.assign(r, data);
    if (changedTime) { r.firedAt = null; r.snoozeUntil = null; }
    if (cloud.connected()) r.wantCal = f.cal.checked;
    toast('Guardado');
  } else {
    r = { id: uid(), createdAt: Date.now(), done: false, doneAt: null, firedAt: null, snoozeUntil: null, inCal: false, ...data };
    if (due < Date.now()) r.firedAt = due - r.alert * MIN; // no avisar de algo creado en el pasado
    state.reminders.push(r);
    if (f.cal.checked) { if (cloud.connected()) r.wantCal = true; else sendToCalendar(r); }
    toast('Recordatorio creado', `${dayLabel(new Date(due))} · ${fmtTime(new Date(due))}`);
    // Salta al día en el calendario si estamos ahí
    calSel = startOfDay(new Date(due)); calMonth = new Date(calSel.getFullYear(), calSel.getMonth(), 1);
  }
  vibrate(10);
  closeSheet(); commit(); bellRing();
});
$('#btnDelete').addEventListener('click', () => { const id = editing?.id; closeSheet(); if (id) deleteReminder(id); });
$('#btnAddCal').addEventListener('click', () => { if (!editing) return; sendToCalendar(editing); save(); toast('Enviado a ' + PROVIDERS[state.settings.calProvider]); });

/* ---------- Teclado ---------- */
document.addEventListener('keydown', e => {
  const typing = /input|textarea|select/i.test(document.activeElement?.tagName);
  if (e.key === 'Escape') { if (sheet.classList.contains('open')) closeSheet(); else if (menu.classList.contains('open')) openMenu(false); else if (!$('#searchBar').hidden) toggleSearch(false); return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === '+') { e.preventDefault(); openSheet(); }
  else if ('12345'.includes(e.key)) setTab(['home', 'calendar', 'list', 'done', 'settings'][+e.key - 1]);
});

/* ---------- Service worker ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => { });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded && !document.body.classList.contains('sheet-open')) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', e => {
    const { type, id, action } = e.data || {};
    if (type !== 'notif') return;
    if (action === 'snooze') snooze(id, 10);
    else if (action === 'done') completeReminder(id);
    else if (byId(id)) openSheet({ id });
  });
}


/* =========================================================
   Cuenta de Google: sincronización (Drive, carpeta privada de la app)
   y eventos automáticos en Google Calendar. Sin servidores propios.
   ========================================================= */
const cloud = (() => {
  const CLIENT_ID = '45625838324-6vvmo4v7faid1jecsm5sku2kk9a0k20n.apps.googleusercontent.com';
  const SCOPES = 'openid email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/calendar.events';
  const REDIRECT = location.origin + location.pathname;
  const AKEY = 'reminder.auth';
  const FILE = 'reminder-data.json';
  const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const GCOLOR = { personal: '6', trabajo: '7', casa: '10', salud: '4', finanzas: '9', otros: '8' };
  let auth = {};
  try { auth = JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) { }
  let status = 'idle', lastError = '', busy = false, again = false, timer = null;
  const saveAuth = () => { try { localStorage.setItem(AKEY, JSON.stringify(auth)); } catch (e) { } };
  const valid = () => !!auth.token && auth.exp > Date.now() + 60e3;
  const connected = () => !!auth.connected;

  function signIn(silent) {
    const st = uid();
    try { sessionStorage.setItem('reminder.oauth', st); } catch (e) { }
    const p = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'token', scope: SCOPES, include_granted_scopes: 'true', state: st });
    if (silent) p.set('prompt', 'none'); else p.set('prompt', 'select_account');
    if (auth.email) p.set('login_hint', auth.email);
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
  }

  // Devuelve true si la página se va a Google (para no seguir arrancando)
  function boot() {
    const h = location.hash;
    if (/access_token=|error=/.test(h)) {
      const q = new URLSearchParams(h.slice(1));
      history.replaceState(null, '', location.pathname + location.search);
      let expected = null; try { expected = sessionStorage.getItem('reminder.oauth'); } catch (e) { }
      if (q.get('state') && q.get('state') === expected) {
        if (q.get('access_token')) {
          const granted = q.get('scope') || '';
          const wasConnected = auth.connected;
          auth.token = q.get('access_token');
          auth.exp = Date.now() + (+q.get('expires_in') || 3600) * 1000;
          auth.connected = true; auth.needsReconnect = false;
          auth.calOk = granted.includes('calendar.events');
          auth.driveOk = granted.includes('drive.appdata');
          saveAuth();
          try { sessionStorage.removeItem('reminder.silent'); } catch (e) { }
          if (!wasConnected) {
            state.settings.autoCal = true;
            state.reminders.forEach(r => { if (!r.done && !r.inCal && r.due > Date.now() - DAY) r.wantCal = true; });
            stamp(); persist();
            setTimeout(async () => {
              await fetchEmail();
              toast('Cuenta conectada', auth.email || 'Google');
              if (!auth.driveOk || !auth.calOk) toast('Faltan permisos', 'Vuelve a conectar y marca las casillas de Drive y Calendar.');
            }, 2700);
          }
        } else if (q.get('error')) {
          if (auth.connected) { auth.needsReconnect = true; saveAuth(); }
          else setTimeout(() => toast('No se conectó', 'Se canceló el acceso a Google.'), 2700);
        }
      }
      return false;
    }
    return refreshIfNeeded();
  }

  async function api(url, opts = {}) {
    if (!valid()) throw new Error('auth');
    const res = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + auth.token, ...(opts.headers || {}) } });
    if (res.status === 401) { auth.token = null; saveAuth(); throw new Error('auth'); }
    if (!res.ok && ![404, 409, 410].includes(res.status)) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 160));
    return res;
  }
  async function fetchEmail() {
    try { const r = await api('https://openidconnect.googleapis.com/v1/userinfo'); const j = await r.json(); auth.email = j.email; saveAuth(); render(); } catch (e) { }
  }

  /* --- Drive: un único archivo en la carpeta privada de la app --- */
  async function findFile() {
    const q = encodeURIComponent(`name='${FILE}'`);
    const r = await api(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)&orderBy=modifiedTime desc`);
    const j = await r.json(); return (j.files && j.files[0] && j.files[0].id) || null;
  }
  async function pull() {
    if (!auth.fileId) { auth.fileId = await findFile(); saveAuth(); }
    if (!auth.fileId) return null;
    const r = await api(`https://www.googleapis.com/drive/v3/files/${auth.fileId}?alt=media`);
    if (r.status === 404) { auth.fileId = null; saveAuth(); return null; }
    return r.json();
  }
  async function push(data) {
    const body = JSON.stringify(data);
    if (!auth.fileId) {
      const b = 'rmd' + uid();
      const meta = { name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' };
      const mp = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${b}--`;
      const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: mp });
      auth.fileId = (await r.json()).id; saveAuth();
    } else {
      await api(`https://www.googleapis.com/upload/drive/v3/files/${auth.fileId}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    }
  }
  const payload = () => ({ v: 1, app: 'Reminder', at: Date.now(), reminders: state.reminders, tombstones: state.tombstones, profile: { name: state.settings.name } });
  function merge(remote) {
    const tomb = { ...(remote.tombstones || {}) };
    for (const [id, t] of Object.entries(state.tombstones)) tomb[id] = Math.max(tomb[id] || 0, t);
    const map = new Map();
    const ts = r => r.updatedAt || r.createdAt || 0;
    for (const r of (remote.reminders || [])) if (r && r.id) map.set(r.id, r);
    for (const r of state.reminders) { const ex = map.get(r.id); if (!ex || ts(r) > ts(ex)) map.set(r.id, r); }
    for (const [id, r] of map) if (tomb[id] && tomb[id] >= ts(r)) {
      if (r.calEventId && state.reminders.some(x => x.id === id)) state.calTrash.push(r.calEventId);
      map.delete(id);
    }
    state.reminders = [...map.values()];
    state.tombstones = tomb;
    if (!state.settings.name && remote.profile && remote.profile.name) state.settings.name = remote.profile.name;
  }

  /* --- Calendar: un evento por recordatorio, con su id fijo para no duplicar --- */
  const evId = id => 'rmd' + [...id].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const calSig = r => JSON.stringify(['v2', r.title, r.notes || '', r.repeat || 'none', r.alert || 0, r.cat, !!r.done,
    (r.repeat && r.repeat !== 'none') ? hm(new Date(r.due)) + '|' + r.anchorDay : r.due]);
  function localISO(ms) { const d = new Date(ms); return `${ymd(d)}T${hm(d)}:00`; }
  function eventBody(r) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
    const ev = {
      status: 'confirmed',
      summary: (r.done ? '✓ ' : '') + r.title,
      description: (r.notes ? r.notes + '\n\n' : '') + 'Creado con Reminder 🔔',
      start: { dateTime: localISO(r.due), timeZone: tz },
      end: { dateTime: localISO(r.due + 30 * MIN), timeZone: tz },
      reminders: r.done ? { useDefault: false, overrides: [] } : { useDefault: false, overrides: [...new Set([r.alert || 0, 1440])].map(m => ({ method: 'popup', minutes: m })) },
      colorId: GCOLOR[r.cat] || '8',
      extendedProperties: { private: { reminderId: r.id } },
      transparency: 'transparent',
    };
    if (!r.done && rrule(r)) ev.recurrence = ['RRULE:' + rrule(r)];
    return ev;
  }
  async function calSync() {
    if (!auth.calOk) return;
    // Borrados pendientes
    const trash = [...new Set(state.calTrash)];
    for (const id of trash) { await api(`${CAL}/${id}`, { method: 'DELETE' }); state.calTrash = state.calTrash.filter(x => x !== id); }
    for (const r of state.reminders) {
      if (r.wantCal && !r.calEventId && !r.done) {
        const id = evId(r.id);
        let res = await api(`${CAL}?sendUpdates=none`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...eventBody(r) }) });
        if (res.status === 409) res = await api(`${CAL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody(r)) });
        r.calEventId = id; r.calSig = calSig(r); r.inCal = true; r.updatedAt = Date.now();
      } else if (r.calEventId && r.wantCal === false) {
        await api(`${CAL}/${r.calEventId}`, { method: 'DELETE' });
        r.calEventId = null; r.calSig = null; r.inCal = false; r.updatedAt = Date.now();
      } else if (r.calEventId && r.calSig !== calSig(r)) {
        const res = await api(`${CAL}/${r.calEventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventBody(r)) });
        if (res.status === 404 || res.status === 410) { r.calEventId = null; r.calSig = null; r.inCal = false; if (r.done) r.wantCal = false; }
        else r.calSig = calSig(r);
        r.updatedAt = Date.now();
      }
    }
  }

  async function sync(manual) {
    if (!connected()) return;
    if (!valid()) { status = 'auth'; render(); if (manual) signIn(!auth.needsReconnect); return; }
    if (busy) { again = true; return; }
    busy = true; status = 'syncing'; if (tab === 'settings') render();
    try {
      stamp(); // recoge cambios locales aún sin sello
      if (auth.driveOk !== false) {
        const remote = await pull();
        const before = JSON.stringify([state.reminders, state.tombstones]);
        if (remote) { merge(remote); }
        await calSync();
        setBaseline();
        persist();
        const after = JSON.stringify(payload().reminders) + JSON.stringify(state.tombstones);
        const remoteStr = remote ? JSON.stringify(remote.reminders) + JSON.stringify(remote.tombstones || {}) : '';
        if (after !== remoteStr) await push(payload());
        if (before !== JSON.stringify([state.reminders, state.tombstones])) render();
      } else {
        await calSync(); stamp(); persist();
      }
      auth.lastSync = Date.now(); saveAuth();
      status = 'ok'; lastError = '';
      if (manual) toast('Sincronizado');
    } catch (e) {
      status = e.message === 'auth' ? 'auth' : 'error'; lastError = e.message;
      if (manual) toast(status === 'auth' ? 'Hay que volver a conectar' : 'No se pudo sincronizar', status === 'auth' ? '' : 'Lo reintentaré en un momento.');
      console.warn('Reminder sync', e);
    } finally {
      busy = false; render();
      if (again) { again = false; setTimeout(sync, 400); }
    }
  }
  function refreshIfNeeded() {
    if (!auth.connected || valid() || auth.needsReconnect || !navigator.onLine) return false;
    if (document.body.classList.contains('sheet-open')) return false;
    let tried = false; try { tried = sessionStorage.getItem('reminder.silent') === '1'; sessionStorage.setItem('reminder.silent', '1'); } catch (e) { tried = true; }
    if (tried) return false;
    signIn(true); return true;
  }
  function schedule() { if (!connected()) return; clearTimeout(timer); timer = setTimeout(sync, 1500); }

  async function signOut() {
    const t = auth.token;
    auth = {}; saveAuth(); try { localStorage.removeItem(AKEY); } catch (e) { }
    if (t) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch(() => { });
    state.settings.autoCal = false; persist();
    render(); toast('Cuenta desconectada', 'Tus recordatorios siguen en este dispositivo.');
  }

  function settingsCard() {
    const g = '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:none"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6a5.1 5.1 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z"/></svg>';
    if (!connected()) return `<div class="card">
      <h4>Cuenta</h4>
      <div class="row" style="flex-wrap:wrap"><span class="rl" style="flex:1;min-width:200px"><b>Tus recordatorios en todos tus dispositivos</b><small>Conecta tu Google: se guardan en tu Drive (carpeta privada de la app) y se crean solos en tu Google Calendar, con su aviso aunque Reminder esté cerrada.</small></span>
      <button class="btn gbtn" data-set="gConnect">${g} Conectar con Google</button></div>
    </div>`;
    const when = auth.lastSync ? relLabel(auth.lastSync) : '—';
    const st = status === 'syncing' ? 'Sincronizando…'
      : auth.needsReconnect ? 'Hay que volver a conectar'
      : status === 'auth' ? 'Acceso caducado: pulsa Sincronizar para renovarlo'
      : status === 'error' ? 'Sin conexión con Google, reintentando'
      : `Sincronizado ${when}`;
    const warn = status === 'auth' || auth.needsReconnect || status === 'error';
    return `<div class="card">
      <h4>Cuenta</h4>
      <div class="row"><span class="rl"><b style="display:flex;align-items:center;gap:8px">${g}${esc(auth.email || 'Cuenta de Google')}</b><small style="${warn ? 'color:var(--overdue)' : ''}">${st}</small></span>
        ${auth.needsReconnect ? '<button class="btn primary" data-set="gConnect">Reconectar</button>' : '<button class="btn" data-set="gSync">Sincronizar</button>'}</div>
      ${auth.driveOk === false || auth.calOk === false ? `<div class="row"><span class="rl"><small style="color:var(--overdue)">Falta permiso de ${auth.driveOk === false ? 'Drive' : 'Calendar'}. Pulsa «Reconectar» y marca todas las casillas.</small></span><button class="btn" data-set="gConnect">Reconectar</button></div>` : ''}
      <div class="row"><span class="rl"><b>Desconectar</b><small>Los datos se quedan en este dispositivo y en tu Drive</small></span><button class="btn ghost danger" data-set="gDisconnect">Desconectar</button></div>
    </div>`;
  }

  return { boot, sync, schedule, refreshIfNeeded, signIn, signOut, connected, settingsCard, status: () => status };
})();

/* ---------- Arranque ---------- */
function boot() {
  document.getElementById('saveBtn')?.remove(); // por si el móvil aún tiene la página antigua
  applyTheme();
  setBaseline();
  if (cloud.boot()) return; // redirigiendo a Google para renovar el acceso
  const params = new URLSearchParams(location.search);
  setTab(params.get('tab') || 'home', { push: false });
  setInterval(tick, 1000);
  setInterval(checkAlarms, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (cloud.refreshIfNeeded()) return; checkAlarms(); render(); cloud.sync(); } });
  window.addEventListener('online', () => cloud.sync());
  setInterval(() => { if (!document.hidden) cloud.sync(); }, 60000);
  cloud.sync();
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { once: true, passive: true }));

  // Pantalla de carga: 2,6 s exactos
  const splash = $('#splash');
  setTimeout(() => {
    const app = $('#app'); app.hidden = false; app.classList.add('enter');
    app.addEventListener('animationend', e => { if (e.target === app) app.classList.remove('enter'); }, { once: false });
    splash.classList.add('out');
    setTimeout(() => splash.remove(), 500);
    showTomorrow();
    checkAlarms(); render();
    window.addEventListener('resize', () => { if (tab === 'home') renderHome(); });
    const a = params.get('action'), id = params.get('id');
    if (a && id) { a === 'snooze' ? snooze(id) : a === 'done' ? completeReminder(id) : openSheet({ id }); history.replaceState(null, '', location.pathname); }
    if (params.get('new')) { openSheet(); history.replaceState(null, '', location.pathname); }
  }, 2600);
}

// Para pruebas
window.__reminder = { parseNL, state: () => state, cloud: () => cloud };
boot();
})();
