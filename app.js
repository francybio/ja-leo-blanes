/* ==========================================================
   JA·LEO 1990 LEOPOLDO — interacciones
   Portada: un banco de sardinas (boids en canvas) que se aparta
   del puntero; la espiral de su logotipo gira con el scroll;
   la tortilla de patata con tetilla que se cuaja por las dos
   caras y se le da la vuelta; carta en platos de azulejo.
   ========================================================== */
(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const STATIC = /[?&]static\b/.test(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || STATIC;
const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const motion = hasGSAP && !reduced;
if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
document.documentElement.classList.add('js');
if (!motion) document.documentElement.classList.add('no-motion');
const play = (v) => { if (!v) return; const p = v.play(); if (p) p.catch(() => {}); };
const IMG = (f) => 'assets/img/' + f;

/* ---------------- idiomas ---------------- */
const I18N = window.JL_I18N || { langs: [{ c: 'es', n: 'Castellano', loc: 'es-ES' }], ui: { es: {} }, dishes: {} };
const LANGS = I18N.langs, CODES = LANGS.map((l) => l.c), LANG_KEY = 'jaleo-lang';
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let lang = [new URLSearchParams(location.search).get('lang'), store.get(LANG_KEY)].find((c) => CODES.includes(c)) || 'es';
const t = (k, vars) => { let s = (I18N.ui[lang] && I18N.ui[lang][k]) ?? (I18N.ui.es && I18N.ui.es[k]) ?? k; if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]); return s; };
const loc = () => (LANGS.find((l) => l.c === lang) || LANGS[0]).loc;
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const onLang = [];
let refreshT = 0;
const refreshSoon = () => { if (!hasGSAP) return; clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 200); };
function paintSwitches() {
  const cur = LANGS.find((l) => l.c === lang);
  $$('[data-lang-switch]').forEach((box) => { box.innerHTML = `<button class="lang__btn" type="button" aria-expanded="false" aria-label="${t('lang.change')} (${cur.n})"><i class="ph-bold ph-globe-simple" aria-hidden="true"></i><span>${cur.c.toUpperCase()}</span><i class="ph-bold ph-caret-down" aria-hidden="true"></i></button><ul class="lang__menu" hidden>${LANGS.map((l) => `<li><button type="button" lang="${l.c}" data-set-lang="${l.c}"${l.c === lang ? ' aria-current="true"' : ''}><b>${l.c.toUpperCase()}</b>${l.n}</button></li>`).join('')}</ul>`; });
  $$('[data-lang-list]').forEach((box) => { box.innerHTML = `<span>${t('lang.label')}</span>` + LANGS.map((l) => `<button type="button" lang="${l.c}" data-set-lang="${l.c}"${l.c === lang ? ' aria-current="true"' : ''}>${l.n}</button>`).join(''); });
}
function applyLang() {
  document.documentElement.lang = lang; document.title = t('meta.title');
  const md = $('#metaDesc'); if (md) md.setAttribute('content', t('meta.desc'));
  $$('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  $$('[data-i18n-attr]').forEach((el) => el.dataset.i18nAttr.split(';').forEach((p) => { const [a, k] = p.split(':'); if (a && k) el.setAttribute(a.trim(), plain(t(k.trim()))); }));
  paintSwitches(); onLang.forEach((f) => f());
}
function setLang(c) { if (!CODES.includes(c) || c === lang) return; lang = c; store.set(LANG_KEY, c); try { const u = new URL(location.href); if (c === 'es') u.searchParams.delete('lang'); else u.searchParams.set('lang', c); history.replaceState(history.state, '', u); } catch (e) {} applyLang(); refreshSoon(); }
const closeLangMenus = () => $$('.lang__menu:not([hidden])').forEach((m) => { m.hidden = true; m.previousElementSibling.setAttribute('aria-expanded', 'false'); });
document.addEventListener('click', (e) => {
  const sw = e.target.closest('.lang__btn');
  if (sw) { const m = sw.nextElementSibling, open = m.hidden; closeLangMenus(); m.hidden = !open; sw.setAttribute('aria-expanded', String(open)); if (open) { const c = m.querySelector('[aria-current]'); if (c) c.focus(); } return; }
  const set = e.target.closest('[data-set-lang]');
  if (set) { const box = set.closest('[data-lang-switch]'); closeLangMenus(); setLang(set.dataset.setLang); if (box) { const b = box.querySelector('.lang__btn'); if (b) b.focus(); } return; }
  if (!e.target.closest('.lang__menu')) closeLangMenus();
});
document.addEventListener('keydown', (e) => { const m = $('.lang__menu:not([hidden])'); if (!m) return; const items = $$('button', m), i = items.indexOf(document.activeElement); if (e.key === 'Escape') { closeLangMenus(); m.previousElementSibling.focus(); } if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); } });
document.addEventListener('focusin', (e) => { const m = $('.lang__menu:not([hidden])'); if (m && !m.parentNode.contains(e.target)) closeLangMenus(); });

/* ---------------- horario de su cartel · 0 = domingo ---------------- */
const HOURS = { 0: [[600, 990]], 1: [[510, 990], [1170, 1410]], 2: null, 3: null, 4: [[510, 990], [1170, 1410]], 5: [[510, 990], [1170, 1410]], 6: [[540, 990], [1170, 1410]] };
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const madrid = () => { try { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()); const g = (k) => (p.find((x) => x.type === k) || {}).value; return { wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), m: (+g('hour') % 24) * 60 + +g('minute') }; } catch (e) { const d = new Date(); return { wd: d.getDay(), m: d.getHours() * 60 + d.getMinutes() }; } };
const dayName = (wd) => new Intl.DateTimeFormat(loc(), { weekday: 'long' }).format(new Date(2026, 9, 18 + wd, 12));
function paintLive() {
  const { wd, m } = madrid(), today = HOURS[wd] || [];
  const cur = today.find(([a, b]) => m >= a && m < b);
  let txt = '';
  if (cur) txt = t('live.open', { h: hm(cur[1]) });
  else { const later = today.find(([a]) => m < a); if (later) txt = t('live.closed', { when: t('live.today'), h: hm(later[0]) }); else for (let i = 1; i <= 7; i++) { const d = (wd + i) % 7; if (HOURS[d]) { txt = t('live.closed', { when: i === 1 ? t('live.tomorrow') : t('live.on', { d: dayName(d) }), h: hm(HOURS[d][0][0]) }); break; } } }
  $$('[data-live]').forEach((el) => { el.classList.toggle('is-open', !!cur); el.classList.toggle('is-closed', !cur); const s = $('[data-live-text]', el); if (s) s.textContent = txt; });
}
function paintHours() { const ul = $('#hoursList'); if (!ul) return; const { wd } = madrid(); ul.innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => { const h = HOURS[d]; return `<li class="${d === wd ? 'is-today' : ''} ${h ? '' : 'is-off'}"><span>${dayName(d)}${d === wd ? `<small>${t('vis.today')}</small>` : ''}</span><span>${h ? h.map(([a, b]) => hm(a) + '–' + hm(b)).join(' · ') : t('vis.closed')}</span></li>`; }).join(''); }
onLang.push(paintLive, paintHours); setInterval(paintLive, 60000);

/* ---------------- cabecera ---------------- */
const nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');
let lenis = null;
if (motion && typeof window.Lenis !== 'undefined') { lenis = new Lenis({ lerp: 0.11, smoothWheel: true }); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((time) => lenis.raf(time * 1000)); gsap.ticker.lagSmoothing(0); }
const goTo = (sel) => { const el = $(sel); if (!el) return; if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.2 }); else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
const toggleDrawer = (open) => { drawer.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('is-locked', open); if (lenis) open ? lenis.stop() : lenis.start(); };
burger.addEventListener('click', () => toggleDrawer(!drawer.classList.contains('is-open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) { toggleDrawer(false); burger.focus(); } });
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const id = a.getAttribute('href'); if (id.length < 2) return; e.preventDefault(); toggleDrawer(false); goTo(id); history.replaceState(history.state, '', id); }));
let lastY = 0;
addEventListener('scroll', () => { const y = scrollY; nav.classList.toggle('is-solid', y > 40); nav.classList.toggle('is-hidden', y > lastY && y > 700 && !drawer.classList.contains('is-open')); lastY = y; }, { passive: true });
const navLinks = $$('.nav__links a');
if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' }); $$('main section[id]').forEach((s) => io.observe(s)); }

/* ----------------------------------------------------------
   PORTADA · el banco de sardinas (boids)
   ---------------------------------------------------------- */
const hero = $('#inici'), scv = $('#school'), sc = scv ? scv.getContext('2d') : null;
const SB = { w: 0, h: 0, dpr: 1, fish: [], bub: [], ptr: { x: -999, y: -999, on: false }, run: false, vis: true, last: 0, time: 0, grad: null };
function sizeSchool() {
  if (!scv) return;
  const r = scv.getBoundingClientRect(); SB.dpr = Math.min(2, devicePixelRatio || 1); SB.w = r.width; SB.h = r.height;
  scv.width = Math.round(r.width * SB.dpr); scv.height = Math.round(r.height * SB.dpr);
  const n = Math.round(clamp(SB.w * SB.h / 9000, 50, 150)); let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (SB.fish.length !== n) SB.fish = Array.from({ length: n }, () => {
    const a = rnd() * 0.6 - 0.3;
    return { x: SB.w * (SB.w > 900 ? 0.45 + rnd() * 0.5 : rnd()), y: SB.h * (SB.w > 900 ? 0.2 + rnd() * 0.6 : 0.78 + rnd() * 0.18), vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, k: 0.75 + rnd() * 0.5, ph: rnd() * 6.28 };
  });
  SB.bub = Array.from({ length: 18 }, () => ({ x: rnd() * SB.w, y: rnd() * SB.h, r: 1 + rnd() * 3, v: 0.2 + rnd() * 0.5 }));
  // degradado del cuerpo en coordenadas locales (pez de 20 px de largo)
  SB.grad = sc.createLinearGradient(0, -4, 0, 4);
  SB.grad.addColorStop(0, '#2E5E80'); SB.grad.addColorStop(0.35, '#7FA6BF'); SB.grad.addColorStop(0.55, '#E3ECF2'); SB.grad.addColorStop(1, '#F7FAFC');
}
function stepSchool(dt) {
  const F = SB.fish, n = F.length, { w, h, ptr } = SB, f = dt * 60;
  // el banco busca un centro que da vueltas despacio por la derecha
  const wide = w > 900, cx = w * (wide ? 0.68 : 0.5) + Math.cos(SB.time * 0.23) * w * 0.18, cy = h * (wide ? 0.52 : 0.86) + Math.sin(SB.time * 0.31) * h * (wide ? 0.2 : 0.06);
  for (let i = 0; i < n; i++) {
    const a = F[i]; let sx = 0, sy = 0, ax = 0, ay = 0, mx = 0, my = 0, na = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = F[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 > 3600) continue;
      if (d2 < 360) { const inv = 1 / (d2 + 1); sx += dx * inv; sy += dy * inv; }
      ax += b.vx; ay += b.vy; mx += b.x; my += b.y; na++;
    }
    if (na) { a.vx += ((ax / na) - a.vx) * 0.05 * f + ((mx / na) - a.x) * 0.0016 * f; a.vy += ((ay / na) - a.vy) * 0.05 * f + ((my / na) - a.y) * 0.0016 * f; }
    a.vx += sx * 0.9 * f; a.vy += sy * 0.9 * f;
    a.vx += (cx - a.x) * 0.00012 * f; a.vy += (cy - a.y) * 0.00018 * f;
    if (ptr.on) { const dx = a.x - ptr.x, dy = a.y - ptr.y, d = Math.hypot(dx, dy); if (d < 150) { const k = (1 - d / 150) * 1.6 * f; a.vx += dx / (d + 0.1) * k; a.vy += dy / (d + 0.1) * k; } }
    const sp = Math.hypot(a.vx, a.vy), mn = 1.3, mxs = ptr.on ? 5.5 : 3.2;
    if (sp > mxs) { a.vx *= mxs / sp; a.vy *= mxs / sp; } else if (sp < mn) { a.vx *= mn / (sp + 0.01); a.vy *= mn / (sp + 0.01); }
    a.x += a.vx * f; a.y += a.vy * f; a.ph += sp * 0.12 * f;
    if (a.x < -40) a.x = w + 40; else if (a.x > w + 40) a.x = -40;
    if (a.y < -40) a.y = h + 40; else if (a.y > h + 40) a.y = -40;
  }
  SB.bub.forEach((b) => { b.y -= b.v * f; b.x += Math.sin(SB.time * 2 + b.r) * 0.2 * f; if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; } });
}
function drawSchool() {
  const { w, h } = SB; sc.setTransform(SB.dpr, 0, 0, SB.dpr, 0, 0); sc.clearRect(0, 0, w, h);
  // rayos de luz que entran desde la superficie
  sc.save(); sc.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = w * (0.15 + i * 0.2) + Math.sin(SB.time * 0.3 + i) * 40;
    const g = sc.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(150,200,240,.10)'); g.addColorStop(1, 'rgba(150,200,240,0)');
    sc.fillStyle = g; sc.beginPath(); sc.moveTo(x - 30, 0); sc.lineTo(x + 30, 0); sc.lineTo(x + 140, h); sc.lineTo(x - 40, h); sc.closePath(); sc.fill();
  }
  sc.restore();
  sc.strokeStyle = 'rgba(255,255,255,.35)'; sc.lineWidth = 1;
  SB.bub.forEach((b) => { sc.beginPath(); sc.arc(b.x, b.y, b.r, 0, 6.283); sc.stroke(); });
  const L = clamp(w / 70, 15, 24);
  SB.fish.forEach((a) => {
    const sca = L / 20 * a.k, ang = Math.atan2(a.vy, a.vx), wig = Math.sin(a.ph) * 0.35;
    sc.setTransform(SB.dpr * sca, 0, 0, SB.dpr * sca, a.x * SB.dpr, a.y * SB.dpr); sc.rotate(ang);
    // cola en horquilla
    sc.fillStyle = '#6E93AD'; sc.save(); sc.translate(-10, 0); sc.rotate(wig);
    sc.beginPath(); sc.moveTo(0, 0); sc.lineTo(-6, -3.6); sc.lineTo(-4, 0); sc.lineTo(-6, 3.6); sc.closePath(); sc.fill(); sc.restore();
    // cuerpo
    sc.fillStyle = SB.grad; sc.beginPath(); sc.moveTo(11, 0); sc.bezierCurveTo(8, -3.6, -4, -3.4, -10.5, -0.6); sc.lineTo(-10.5, 0.6); sc.bezierCurveTo(-4, 3.6, 8, 3.6, 11, 0); sc.fill();
    // lunares de la sardina y ojo
    sc.fillStyle = 'rgba(20,45,70,.55)'; for (let k = 0; k < 4; k++) { sc.beginPath(); sc.arc(5 - k * 3.2, -1.1, 0.6, 0, 6.283); sc.fill(); }
    sc.fillStyle = '#0B1B2A'; sc.beginPath(); sc.arc(8.2, -0.5, 0.8, 0, 6.283); sc.fill();
  });
  sc.setTransform(1, 0, 0, 1, 0, 0);
}
function loopSchool(ts) {
  if (!SB.run) return;
  const dt = Math.min(0.05, (ts - (SB.last || ts)) / 1000); SB.last = ts; SB.time += dt;
  stepSchool(dt); drawSchool();
  requestAnimationFrame(loopSchool);
}
const startSchool = () => { if (SB.run || reduced || !SB.vis || document.hidden) return; SB.run = true; SB.last = 0; requestAnimationFrame(loopSchool); };
const stopSchool = () => { SB.run = false; };
if (scv) {
  const setPtr = (e) => { const r = scv.getBoundingClientRect(); SB.ptr.x = e.clientX - r.left; SB.ptr.y = e.clientY - r.top; SB.ptr.on = true; };
  hero.addEventListener('pointermove', setPtr); hero.addEventListener('pointerdown', setPtr);
  hero.addEventListener('pointerleave', () => { SB.ptr.on = false; });
  hero.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') SB.ptr.on = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { SB.vis = en.isIntersecting; SB.vis ? startSchool() : stopSchool(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { document.hidden ? stopSchool() : startSchool(); });
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { sizeSchool(); if (!SB.run) drawSchool(); }, 150); });
}

/* ----------------------------------------------------------
   LA TORTILLA · se cuaja por las dos caras y se le da la vuelta
   ---------------------------------------------------------- */
const pcv = $('#panCv'), pc = pcv ? pcv.getContext('2d') : null;
const TR = { w: 0, dpr: 1, side: [0, 0], down: 0, flip: null, cut: 0, cutOn: false, on: false, run: false, last: 0, time: 0, msg: '', spots: [], steam: [], labels: ['', ''] };
const LV = [0.35, 0.75, 1.05];                // cruda · cuajándose · dorada · pasada
const stage = (v) => (v < LV[0] ? 0 : v < LV[1] ? 1 : v < LV[2] ? 2 : 3);
const STOPS = [[0, [246, 227, 154]], [0.35, [240, 207, 110]], [0.75, [221, 160, 70]], [1.05, [176, 108, 40]], [1.4, [104, 56, 22]]];
function tone(v) {
  for (let i = 1; i < STOPS.length; i++) if (v <= STOPS[i][0] || i === STOPS.length - 1) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], k = clamp((v - a) / (b - a), 0, 1); return ca.map((c, j) => Math.round(lerp(c, cb[j], k))); }
  return STOPS[0][1];
}
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function sizePan() {
  if (!pcv) return;
  const r = pcv.getBoundingClientRect(); TR.dpr = Math.min(2, devicePixelRatio || 1); TR.w = r.width;
  pcv.width = Math.round(r.width * TR.dpr); pcv.height = Math.round(r.width * TR.dpr);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  TR.spots = [0, 1].map(() => Array.from({ length: 46 }, () => { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.92; return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.025 + rnd() * 0.07, k: 0.4 + rnd() * 0.6 }; }));
  TR.potato = Array.from({ length: 14 }, () => { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.8; return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.08 + rnd() * 0.07, a: rnd() * 3 }; });
}
// cara de la tortilla (vista desde arriba) · v = punto de cocción de esa cara
function faceTortilla(r, v, spots, wedge) {
  const c = tone(v);
  pc.save();
  pc.beginPath();
  if (wedge) { pc.moveTo(0, 0); pc.arc(0, 0, r, wedge[1], wedge[0] + 6.283); pc.closePath(); } else pc.arc(0, 0, r, 0, 6.283);
  pc.clip();
  const g = pc.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
  g.addColorStop(0, rgb(c.map((x) => Math.min(255, x + 18)))); g.addColorStop(0.8, rgb(c)); g.addColorStop(1, rgb(c.map((x) => x * 0.72)));
  pc.fillStyle = g; pc.fillRect(-r, -r, r * 2, r * 2);
  // trozos de patata que se adivinan mientras está cruda
  if (v < 0.6) { pc.strokeStyle = `rgba(255,248,220,${(0.6 - v) * 0.9})`; pc.lineWidth = r * 0.012; TR.potato.forEach((p) => { pc.beginPath(); pc.ellipse(p.x * r, p.y * r, p.r * r, p.r * r * 0.6, p.a, 0, 6.283); pc.stroke(); }); }
  // tostado a manchas
  if (v > 0.45) spots.forEach((s) => { const a = clamp((v - 0.45) * 1.1 * s.k, 0, 0.55); pc.fillStyle = `rgba(${v > 1.05 ? '60,28,8' : '140,72,22'},${a})`; pc.beginPath(); pc.arc(s.x * r, s.y * r, s.r * r * (0.55 + v * 0.3), 0, 6.283); pc.fill(); });
  // brillo de huevo líquido
  if (v < 0.4) { pc.fillStyle = `rgba(255,255,255,${(0.4 - v) * 0.7})`; pc.beginPath(); pc.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.12, -0.5, 0, 6.283); pc.fill(); }
  pc.restore();
  // canto redondeado
  pc.strokeStyle = rgb(c.map((x) => x * 0.6), 0.7); pc.lineWidth = r * 0.05;
  pc.beginPath(); if (wedge) { pc.arc(0, 0, r * 0.975, wedge[1], wedge[0] + 6.283); } else pc.arc(0, 0, r * 0.975, 0, 6.283); pc.stroke();
}
// canto de un corte: capas de patata, huevo cuajado y queso fundido
function cutFace(r, a, th) {
  if (th < 0.5) return;
  const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
  pc.fillStyle = '#F2D272'; pc.beginPath(); pc.moveTo(0, 0); pc.lineTo(ex, ey); pc.lineTo(ex, ey + th); pc.lineTo(0, th); pc.closePath(); pc.fill();
  pc.strokeStyle = 'rgba(255,250,232,.85)'; pc.lineWidth = Math.max(1, r * 0.01);
  for (let i = 1; i < 4; i++) { const y = th * i / 4; pc.beginPath(); pc.moveTo(0, y); pc.lineTo(ex, ey + y); pc.stroke(); }
  pc.fillStyle = 'rgba(255,244,205,.95)'; pc.beginPath(); pc.ellipse(ex * 0.55, ey * 0.55 + th * 0.5, r * 0.09, th * 0.2, a, 0, 6.283); pc.fill();
  pc.lineWidth = Math.max(1.5, r * 0.02);
  pc.strokeStyle = rgb(tone(TR.side[1 - TR.down]).map((x) => x * 0.85)); pc.beginPath(); pc.moveTo(0, 0); pc.lineTo(ex, ey); pc.stroke();
  pc.strokeStyle = rgb(tone(TR.side[TR.down]).map((x) => x * 0.85)); pc.beginPath(); pc.moveTo(0, th); pc.lineTo(ex, ey + th); pc.stroke();
}
function drawPan() {
  if (!pc) return;
  const W = TR.w, cx = W * 0.47, cy = W * 0.5, R = W * 0.36, r = R * 0.84;
  pc.setTransform(TR.dpr, 0, 0, TR.dpr, 0, 0); pc.clearRect(0, 0, W, W);
  // fuego de gas
  if (!TR.cutOn) for (let i = 0; i < 28; i++) {
    const a = i / 28 * 6.283, fl = 0.75 + Math.sin(TR.time * 14 + i * 2.1) * 0.25;
    const x = cx + Math.cos(a) * R * 0.98, y = cy + Math.sin(a) * R * 0.98;
    pc.fillStyle = `rgba(90,150,255,${0.55 * fl})`; pc.beginPath(); pc.ellipse(x + Math.cos(a) * 6 * fl, y + Math.sin(a) * 6 * fl, 7 * fl, 3, a, 0, 6.283); pc.fill();
  }
  // mango
  pc.save(); pc.translate(cx, cy); pc.rotate(0.62);
  const hg = pc.createLinearGradient(0, -R * 0.08, 0, R * 0.08); hg.addColorStop(0, '#3A3A40'); hg.addColorStop(0.5, '#15151A'); hg.addColorStop(1, '#2A2A30');
  pc.fillStyle = hg; pc.beginPath(); pc.roundRect ? pc.roundRect(R * 0.9, -R * 0.07, R * 0.95, R * 0.14, R * 0.07) : pc.rect(R * 0.9, -R * 0.07, R * 0.95, R * 0.14); pc.fill();
  pc.restore();
  // sartén
  const sg = pc.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R);
  sg.addColorStop(0, '#3B3B42'); sg.addColorStop(0.85, '#1E1E23'); sg.addColorStop(0.93, '#4A4A52'); sg.addColorStop(1, '#101014');
  pc.fillStyle = sg; pc.beginPath(); pc.arc(cx, cy, R, 0, 6.283); pc.fill();
  pc.strokeStyle = 'rgba(255,255,255,.18)'; pc.lineWidth = 2; pc.beginPath(); pc.arc(cx, cy, R * 0.99, Math.PI * 1.05, Math.PI * 1.6); pc.stroke();
  // aceite que brilla en el fondo
  pc.fillStyle = 'rgba(255,200,90,.06)'; pc.beginPath(); pc.arc(cx, cy, r * 1.06, 0, 6.283); pc.fill();

  const top = 1 - TR.down;
  pc.save(); pc.translate(cx, cy);
  if (TR.flip) {
    // vuelta: se levanta, se aplana y enseña la otra cara a mitad de camino
    const k = TR.flip.t, lift = Math.sin(k * Math.PI), sy = Math.abs(Math.cos(k * Math.PI));
    const face = k < 0.5 ? TR.flip.from : 1 - TR.flip.from;
    pc.fillStyle = `rgba(0,0,0,${0.35 - lift * 0.2})`; pc.beginPath(); pc.ellipse(0, r * 0.06, r * (1 - lift * 0.15), r * (1 - lift * 0.15), 0, 0, 6.283); pc.fill();
    pc.translate(0, -lift * R * 0.55); pc.rotate(lift * 0.25); pc.scale(1 + lift * 0.08, Math.max(0.04, sy) * (1 + lift * 0.08));
    faceTortilla(r, TR.side[face], TR.spots[face]);
  } else if (TR.cutOn) {
    const k = TR.cut, a0 = -0.38, a1 = 0.38, th = r * 0.13, ox = k * r * 0.42, oy = k * r * 0.1;
    pc.fillStyle = 'rgba(0,0,0,.35)'; pc.beginPath(); pc.arc(0, r * 0.05, r, 0, 6.283); pc.fill();
    faceTortilla(r, TR.side[top], TR.spots[top], [a0, a1]);
    cutFace(r, a0, th * k);                  // el canto que queda a la vista en el hueco
    // el queso de tetilla que se estira entre la tortilla y la porción
    pc.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const t0 = 0.22 + i * 0.15, ex = Math.cos(a0) * r * t0, ey = Math.sin(a0) * r * t0 + th * 0.5 * k;
      pc.strokeStyle = `rgba(255,244,205,${0.95 - k * 0.35})`; pc.lineWidth = r * (0.03 - i * 0.004) * (1.2 - k * 0.7);
      pc.beginPath(); pc.moveTo(ex, ey); pc.quadraticCurveTo(ex + ox * 0.5, ey + oy * 0.5 + r * 0.08 * k, ex + ox, ey + oy); pc.stroke();
    }
    pc.save(); pc.translate(ox, oy);
    pc.fillStyle = `rgba(0,0,0,${0.3 * k})`; pc.beginPath(); pc.moveTo(0, th); pc.arc(0, th, r, a0, a1); pc.closePath(); pc.fill();
    cutFace(r, a1, th);
    pc.save(); pc.beginPath(); pc.moveTo(0, 0); pc.arc(0, 0, r, a0, a1); pc.closePath(); pc.clip();
    faceTortilla(r, TR.side[top], TR.spots[top]); pc.restore();
    pc.restore();
  } else {
    pc.fillStyle = 'rgba(0,0,0,.35)'; pc.beginPath(); pc.arc(0, r * 0.05, r, 0, 6.283); pc.fill();
    faceTortilla(r, TR.side[top], TR.spots[top]);
  }
  pc.restore();
  // vapor
  TR.steam.forEach((p) => { pc.fillStyle = `rgba(255,255,255,${p.a})`; pc.beginPath(); pc.arc(p.x, p.y, p.r, 0, 6.283); pc.fill(); });
  pc.setTransform(1, 0, 0, 1, 0, 0);
}
const sidesBox = $('#sides'), trMsg = $('#trMsg'), btnFlip = $('#btnFlip'), btnCut = $('#btnCut'), btnAgain = $('#btnAgain'), trTip = $('#trTip');
function paintSides(force) {
  if (!sidesBox) return;
  if (force || !sidesBox.children.length) sidesBox.innerHTML = [0, 1].map((i) => `<div class="side" data-side="${i}"><span>${t('tr.side', { n: i + 1 })}<i class="ph-bold ph-fire" aria-hidden="true"></i></span><i aria-hidden="true"></i><em></em></div>`).join('');
  [0, 1].forEach((i) => {
    const row = sidesBox.children[i], v = TR.side[i], st = t('tr.s' + stage(v));
    row.children[1].style.setProperty('--p', clamp(v / 1.4, 0, 1) * 100 + '%');
    const fire = row.querySelector('.ph-fire'); if (fire) fire.style.display = TR.down === i && !TR.cutOn ? 'inline' : 'none';
    if (row.children[2].textContent !== st) row.children[2].textContent = st;
  });
}
function setMsg(k) { if (TR.msg === k) return; TR.msg = k; if (trMsg) trMsg.textContent = k ? t(k) : ''; }
function judge() {
  const [a, b] = TR.side, both = a >= LV[1] && b >= LV[1], over = a > LV[2] || b > LV[2];
  if (TR.cutOn) return setMsg('tr.cutd');
  btnCut.disabled = !both;
  if (over) { setMsg('tr.oops'); btnAgain.hidden = false; } else if (both) setMsg('tr.ready'); else setMsg('');
}
function stepPan(dt) {
  if (!TR.cutOn && !TR.flip) { TR.side[TR.down] = Math.min(1.4, TR.side[TR.down] + dt * 0.1); TR.side[1 - TR.down] = Math.min(1.4, TR.side[1 - TR.down] + dt * 0.01); }
  if (TR.flip && reduced) TR.flip = null;
  if (TR.flip) { TR.flip.t += dt / 0.75; if (TR.flip.t >= 1) { TR.flip = null; } }
  if (TR.cutOn && TR.cut < 1) TR.cut = Math.min(1, TR.cut + dt / 0.9);
  const W = TR.w, cx = W * 0.47, cy = W * 0.5, heat = TR.cutOn ? 0.15 : 0.4 + TR.side[TR.down] * 0.4;
  if (Math.random() < heat * dt * 30) TR.steam.push({ x: cx + (Math.random() - 0.5) * W * 0.4, y: cy + (Math.random() - 0.5) * W * 0.3, r: 4 + Math.random() * 8, a: 0.18, vy: 0.4 + Math.random() * 0.6 });
  TR.steam.forEach((p) => { p.y -= p.vy * dt * 60; p.r += dt * 6; p.a -= dt * 0.12; });
  TR.steam = TR.steam.filter((p) => p.a > 0);
}
function loopPan(ts) {
  if (!TR.run) return;
  const dt = Math.min(0.5, (ts - (TR.last || ts)) / 1000); TR.last = ts; TR.time += dt;
  stepPan(dt); drawPan(); paintSides(); judge();
  requestAnimationFrame(loopPan);
}
const startPan = () => { if (TR.run || !TR.on || document.hidden) return; TR.run = true; TR.last = 0; requestAnimationFrame(loopPan); };
function flipIt() {
  if (TR.flip || TR.cutOn) return;
  TR.flip = { t: 0, from: 1 - TR.down }; TR.down = 1 - TR.down;
  if (trTip) trTip.style.opacity = 0;
  if (reduced) { TR.flip = null; drawPan(); }
  paintSides();
}
function cutIt() { if (btnCut.disabled || TR.cutOn) return; TR.cutOn = true; TR.cut = reduced ? 1 : 0; btnFlip.disabled = true; btnCut.disabled = true; btnAgain.hidden = false; judge(); paintSides(); drawPan(); }
function resetPan() { TR.side = [0, 0]; TR.down = 0; TR.flip = null; TR.cutOn = false; TR.cut = 0; TR.msg = '-'; btnFlip.disabled = false; btnCut.disabled = true; btnAgain.hidden = true; if (trTip) trTip.style.opacity = 1; judge(); paintSides(true); drawPan(); }
if (pcv) {
  pcv.addEventListener('click', flipIt);
  btnFlip.addEventListener('click', flipIt); btnCut.addEventListener('click', cutIt); btnAgain.addEventListener('click', resetPan);
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { TR.on = en.isIntersecting; TR.on ? startPan() : (TR.run = false); }, { threshold: 0.35 }).observe(pcv);
  document.addEventListener('visibilitychange', () => { document.hidden ? (TR.run = false) : startPan(); });
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { sizePan(); drawPan(); }, 150); });
  onLang.push(() => { paintSides(true); const k = TR.msg; TR.msg = '-'; setMsg(k === '-' ? '' : k); });
}

/* ---------------- carta · platos de azulejo ---------------- */
const SECS = [['mar', 'ph-fish-simple'], ['tapes', 'ph-bowl-food'], ['postres', 'ph-cookie']];
let dishShots = [], dishST = [];
function paintDishes() {
  const box = $('#dishes'); if (!box) return;
  dishShots = []; dishST.forEach((a) => { if (a.scrollTrigger) a.scrollTrigger.kill(); a.kill(); }); dishST = [];
  box.innerHTML = SECS.map(([sec, ico]) => `<section class="csec"><h3 class="csec__h">${t('ca.' + sec)}</h3><div class="plates">${(I18N.dishes[sec] || []).map(([k, f]) => {
    const inner = `<span class="plate__d">${f ? `<img src="${IMG(f)}" alt="" loading="lazy">` : `<span class="noimg"><i class="ph-bold ${ico}" aria-hidden="true"></i></span>`}</span><b>${t('d.' + k)}</b><span>${t('d.' + k + 'D')}</span>`;
    if (!f) return `<div class="plate plate--plain">${inner}</div>`;
    dishShots.push([f, 'd.' + k]);
    return `<button class="plate reveal" type="button" data-shot="dish:${dishShots.length - 1}" aria-label="${plain(t('d.' + k))}">${inner}</button>`;
  }).join('')}</div></section>`).join('');
  if (motion) $$('.plate.reveal', box).forEach((el) => dishST.push(gsap.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } })));
  else $$('.plate.reveal', box).forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  refreshSoon();
}
onLang.push(paintDishes);

/* ---------------- fotos + visor ---------------- */
const SHOTS = [['sardines-fresques.jpg', 'cap.fresques'], ['pop.jpg', 'cap.pop'], ['calamars.jpg', 'cap.calamars'], ['interior.jpg', 'cap.interior'], ['sonsos.jpg', 'cap.sonsos'], ['croquetes.jpg', 'cap.croquetes'], ['coctel-mar.jpg', 'cap.coctel'], ['padron-sardines.jpg', 'cap.padron'], ['seitons-fregits.jpg', 'cap.seitons'], ['tomaquet-ventresca.jpg', 'cap.ventresca'], ['flam-pastis.jpg', 'cap.flam']];
function paintTiles() {
  const box = $('#tiles'); if (!box) return;
  $$('.tile:not(.tile--vid)', box).forEach((n) => n.remove());
  box.insertAdjacentHTML('beforeend', SHOTS.map(([f, k], i) => `<button class="tile${i === 0 ? ' tile--big' : ''}" type="button" data-shot="tile:${i}"><img src="${IMG(f)}" alt="${plain(t(k))}" loading="lazy"><span>${t(k)}</span></button>`).join(''));
}
onLang.push(paintTiles);
const lb = $('#lb'); let lbList = SHOTS, lbI = 0, lbReturn = null;
const showLb = () => { const [f, k] = lbList[lbI]; $('#lbImg').src = IMG(f); $('#lbImg').alt = plain(t(k)); $('#lbCap').textContent = plain(t(k)); };
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-shot]'); if (!b) return;
  const [kind, i] = b.dataset.shot.split(':'); lbList = kind === 'dish' ? dishShots : SHOTS; lbI = +i; lbReturn = b;
  showLb(); lb.hidden = false; document.body.classList.add('is-locked'); if (lenis) lenis.stop(); $('#lbX').focus();
});
const closeLb = () => { lb.hidden = true; document.body.classList.remove('is-locked'); if (lenis) lenis.start(); if (lbReturn) lbReturn.focus(); };
$('#lbX').addEventListener('click', closeLb);
$('#lbP').addEventListener('click', () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLb(); });
$('#lbN').addEventListener('click', () => { lbI = (lbI + 1) % lbList.length; showLb(); });
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') $('#lbP').click(); if (e.key === 'ArrowRight') $('#lbN').click(); if (e.key === 'Tab') { const f = $$('button', lb), i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
onLang.push(() => { if (!lb.hidden) showLb(); });
const vid = $('#vid');
if (vid && 'IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting && !STATIC) play(vid); else vid.pause(); }), { threshold: 0.3 }).observe(vid);

/* ---------------- arranque ---------------- */
applyLang();
sizeSchool(); stepSchool(0.016); drawSchool();
sizePan(); resetPan();

if (motion) {
  startSchool();
  gsap.from('.mark', { y: 80, opacity: 0, duration: 1.1, ease: 'power4.out' });
  gsap.from('#bigSpiral', { rotate: -540, duration: 1.8, ease: 'power3.out' });
  gsap.from('.mark__sub, .hero__sub, .hero__lead, .hero__meta, .hero .ctas', { y: 22, opacity: 0, duration: 0.7, stagger: 0.08, delay: 0.35 });
  // la espiral del logotipo (su pulpo) gira con el scroll
  gsap.to('#bigSpiral', { rotate: 540, ease: 'none', scrollTrigger: { trigger: '#inici', start: 'top top', end: 'bottom top', scrub: 0.6 } });
  gsap.to('.logo .spiral', { rotate: 1080, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
  $$('.reveal').forEach((el) => { if (el.closest('#dishes')) return; gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }); });
  gsap.fromTo('.poster--2', { yPercent: 10 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '#focs', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.tile', { y: 50, opacity: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '#tiles', start: 'top 85%', once: true } });
  addEventListener('load', () => ScrollTrigger.refresh());
} else $$('.reveal').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
})();
