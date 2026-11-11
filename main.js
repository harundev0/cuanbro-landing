document.documentElement.classList.add('js');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hero headline: wrap each word so it can rise in on load (text stays readable without JS).
document.querySelectorAll('[data-words]').forEach((h) => {
  let i = 0;
  [...h.childNodes].forEach((node) => {
    if (node.nodeType !== 3) return;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(part); return; }
      const w = document.createElement('span');
      w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = part;
      frag.append(w);
    });
    node.replaceWith(frag);
  });
});

// Entrances: parts rise once when they enter, staggered within their group.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

const rises = [...document.querySelectorAll('.rise')];
rises.forEach((el) => {
  const i = [...el.parentElement.children].filter((c) => c.classList.contains('rise')).indexOf(el);
  el.style.setProperty('--d', `${Math.min(i, 5) * 80}ms`);
  io.observe(el);
});
// The hero stage opens on load, not on scroll.
requestAnimationFrame(() => setTimeout(() => document.querySelector('.shutter').classList.add('in'), 120));
// Safety net: never leave on-screen content hidden if the observer never fires.
setTimeout(() => rises.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 2500);

// Nav gets its line once the page scrolls.
const nav = document.querySelector('.nav');
const onScrollNav = () => nav.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

// Hero fragment: the search filters the product cards, like in the app.
const q = document.getElementById('app-q');
const cards = [...document.querySelectorAll('.app-card')];
q.addEventListener('input', () => {
  const term = q.value.trim().toLowerCase();
  let shown = 0;
  cards.forEach((c) => { const hit = c.dataset.name.includes(term); c.hidden = !hit; shown += hit; });
  document.getElementById('app-count').textContent = `${shown} Product Sheet`;
  document.querySelector('.app-empty').hidden = shown > 0;
});

// DNA Product Lock switch.
const lock = document.getElementById('lock');
const lockSw = document.getElementById('lock-switch');
lockSw.addEventListener('click', () => {
  const on = lockSw.getAttribute('aria-checked') !== 'true';
  lockSw.setAttribute('aria-checked', String(on));
  lock.dataset.locked = String(on);
  document.getElementById('lock-word').textContent = on ? 'tetap sama' : 'berubah-ubah';
  document.getElementById('lock-value').textContent = on ? 'Locked' : 'Unlocked';
});

// Reel: the real clip plays scene by scene; scenes, segments and caption follow it.
const reel = document.getElementById('reel');
const v = document.getElementById('reel-v');
const scenes = [...reel.querySelectorAll('.scene')];
const segs = [...reel.querySelectorAll('.reel-segs b')];
const cap = document.getElementById('reel-cap');
const playBtn = document.getElementById('reel-play');
const starts = scenes.map((s) => parseFloat(s.dataset.t));
const sceneAt = (t) => starts.reduce((idx, st, i) => (t >= st ? i : idx), 0);
console.assert(sceneAt(0) === 0 && sceneAt(2.6) === 1 && sceneAt(7.5) === 3 && sceneAt(9.9) === 3, 'sceneAt');
let current = -1;
const paint = () => {
  const t = v.currentTime;
  const dur = v.duration || 10;
  const i = sceneAt(t);
  segs.forEach((b, k) => {
    const end = starts[k + 1] ?? dur;
    b.style.setProperty('--p', k < i ? 1 : k > i ? 0 : Math.min(1, (t - starts[k]) / (end - starts[k])));
  });
  if (i !== current) {
    current = i;
    scenes.forEach((s, k) => s.classList.toggle('is-on', k === i));
    cap.textContent = scenes[i].dataset.cap;
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
  }
};
const loop = () => { paint(); if (!v.paused) requestAnimationFrame(loop); };
v.addEventListener('play', () => { reel.classList.add('is-playing'); playBtn.setAttribute('aria-label', 'Jeda video'); requestAnimationFrame(loop); });
v.addEventListener('pause', () => { reel.classList.remove('is-playing'); playBtn.setAttribute('aria-label', 'Putar video'); paint(); });
v.addEventListener('seeked', paint);
playBtn.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
scenes.forEach((s) => s.addEventListener('click', () => { v.currentTime = parseFloat(s.dataset.t) + 0.05; if (v.paused) v.play(); }));
// Autoplay only while on screen, and never for reduced motion.
if (!reduce) {
  new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 }).observe(reel);
}

// Live thing: how many sales pay back the Rp49.000 licence.
const PRICE = 49000;
const salesToPayBack = (komisi) => (komisi > 0 ? Math.ceil(PRICE / komisi) : null);
console.assert(salesToPayBack(5000) === 10 && salesToPayBack(49000) === 1 && salesToPayBack(7000) === 7 && salesToPayBack(0) === null, 'payback calc');
const komisi = document.getElementById('komisi');
const lunas = document.getElementById('lunas');
komisi.addEventListener('input', () => {
  const n = parseInt(komisi.value.replace(/\D/g, ''), 10) || 0;
  const sales = salesToPayBack(n);
  komisi.value = n ? n.toLocaleString('id-ID') : '';
  lunas.textContent = sales === null ? '… penjualan' : sales === 1 ? 'satu penjualan' : `${sales.toLocaleString('id-ID')} penjualan`;
  lunas.classList.remove('bump'); void lunas.offsetWidth; lunas.classList.add('bump');
});

// FAQ: one answer open at a time.
const fqs = [...document.querySelectorAll('.fq')];
fqs.forEach((b) => b.addEventListener('click', () => {
  const open = b.getAttribute('aria-expanded') === 'true';
  fqs.forEach((o) => { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = true; });
  if (!open) { b.setAttribute('aria-expanded', 'true'); document.getElementById(b.getAttribute('aria-controls')).hidden = false; }
}));

// Download: pick the visitor's OS, then download its installer.
// shortcut: installer paths are placeholders, replace with the real release URLs before launch.
const INSTALLERS = {
  windows: { url: 'downloads/CuanBro_x64-setup.exe', file: '.exe' },
  mac: { url: 'downloads/CuanBro_universal.dmg', file: '.dmg' },
  linux: { url: 'downloads/CuanBro_amd64.deb', file: '.deb' },
};
const label = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };
const note = document.getElementById('cta-note');
const osBtn = document.getElementById('os-btn');
const osList = document.getElementById('os-list');
const opts = [...osList.querySelectorAll('[role="option"]')];
let osValue = 'windows';
let active = 0;

const setOs = (v) => {
  osValue = v;
  opts.forEach((o) => o.setAttribute('aria-selected', String(o.dataset.value === v)));
  document.getElementById('os-label').textContent = label[v];
  document.querySelector('#os-ico use').setAttribute('href', `#os-${v}`);
  osBtn.setAttribute('aria-label', `Sistem operasi: ${label[v]}`);
  note.textContent = `Kamu akan mengunduh installer ${INSTALLERS[v].file} untuk ${label[v]}.`;
};
const setActive = (i) => {
  active = (i + opts.length) % opts.length;
  opts.forEach((o, k) => o.classList.toggle('is-active', k === active));
  osList.setAttribute('aria-activedescendant', opts[active].id);
};
const openList = () => {
  osList.hidden = false;
  osBtn.setAttribute('aria-expanded', 'true');
  setActive(opts.findIndex((o) => o.dataset.value === osValue));
  requestAnimationFrame(() => osList.classList.add('open'));
  osList.focus();
};
const closeList = (refocus = true) => {
  if (osList.hidden) return;
  osList.classList.remove('open');
  osBtn.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!osList.classList.contains('open')) osList.hidden = true; }, 180);
  if (refocus) osBtn.focus();
};
const choose = (i) => { setOs(opts[i].dataset.value); closeList(); };

osBtn.addEventListener('click', () => (osList.hidden ? openList() : closeList()));
osBtn.addEventListener('keydown', (e) => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openList(); } });
osList.addEventListener('keydown', (e) => {
  const keys = { ArrowDown: () => setActive(active + 1), ArrowUp: () => setActive(active - 1), Home: () => setActive(0), End: () => setActive(opts.length - 1), Enter: () => choose(active), ' ': () => choose(active), Escape: () => closeList() };
  if (keys[e.key]) { e.preventDefault(); keys[e.key](); } else if (e.key === 'Tab') closeList(false);
});
opts.forEach((o, i) => {
  o.addEventListener('click', () => choose(i));
  o.addEventListener('pointermove', () => setActive(i));
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#os-pick')) closeList(false); });

const ua = navigator.userAgent;
setOs(/Mac/i.test(ua) ? 'mac' : /Linux|X11/i.test(ua) && !/Android/i.test(ua) ? 'linux' : 'windows');
document.getElementById('dl-form').addEventListener('submit', (e) => { e.preventDefault(); location.href = INSTALLERS[osValue].url; });
document.querySelectorAll('a[data-os]').forEach((a) => a.addEventListener('click', () => setOs(a.dataset.os)));
