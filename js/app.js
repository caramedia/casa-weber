// Casa Weber - interfata: limba (RO/EN), antet, aparitii, film, harta, vizualizatorul 3D al camerelor.
import { initTour, Viewer3D } from './walk.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ texte in engleza (romana e direct in HTML)
const EN = {
  'skip': 'Skip to content',
  'nav.rooms': 'Rooms', 'nav.film': 'Film', 'nav.reviews': 'Reviews', 'nav.location': 'Location',
  'cta.book': 'Book', 'cta.book2': 'Book a night', 'cta.rooms': 'See the rooms',
  'tour.label': 'A walk through the house', 'tour.steps': 'Tour steps',
  'tour.eyebrow': 'Sighișoara · Transylvania',
  'tour.sub': 'An old house with a soul, at the foot of the citadel.',
  'tour.hint': 'Scroll to step inside',
  'tour.c1': 'The door is open.', 'tour.c1b': 'Come in, you are expected.',
  'tour.c2': 'Wood, old brick and warm light.',
  'tour.c3': 'Sleep beneath the old beams of the house.',
  'tour.c4': 'And outside your window — the citadel.',
  'tour.d0': 'Street', 'tour.d1': 'Entrance', 'tour.d2': 'Stairs', 'tour.d3': 'Attic', 'tour.d4': 'Window',
  'tour.skip': 'Skip the tour',
  'intro.eyebrow': 'Welcome',
  'intro.title': 'A house with a story, in the heart of Sighișoara.',
  'intro.lead': 'Exposed brick, wooden beams, period furniture and lamps with a warm glow. Plus every modern comfort: air conditioning, a private bathroom and WiFi. All a few steps from the Clock Tower.',
  'intro.f1': 'Booking.com score, from 363 reviews', 'intro.f2': 'to Hermann Oberth Square', 'intro.f3a': 'Free', 'intro.f3': 'parking and WiFi',
  'rooms.eyebrow': 'The rooms', 'rooms.title': 'Pick your corner.',
  'rooms.sub': 'Three spaces, each with its own character. All have a private shower room, air conditioning, TV, minibar and WiFi.',
  'rooms.view3d': 'View in 3D',
  'rooms.ap.name': 'The Chandelier Apartment', 'rooms.ap.aria': 'View the apartment in 3D',
  'rooms.ap.alt': 'Bedroom with carved beds, a chandelier and wooden floors',
  'rooms.ap.l1': '1 large double bed + 1 single bed', 'rooms.ap.l2': 'Views over the town', 'rooms.ap.l3': 'Coffee machine in the room',
  'rooms.ma.name': 'The Attic', 'rooms.ma.aria': 'View the attic in 3D',
  'rooms.ma.alt': 'Attic room with old wooden beams, a brick wall and a double bed',
  'rooms.ma.l1': '2 large double beds', 'rooms.ma.l2': 'Exposed old beams', 'rooms.ma.l3': 'The largest space in the house',
  'rooms.cd.name': 'The Double Room', 'rooms.cd.aria': 'View the double room in 3D',
  'rooms.cd.alt': 'Double room under the roof, with a carved wooden bed and a sloped window',
  'rooms.cd.l1': '1 large double bed', 'rooms.cd.l2': 'Facing a quiet street', 'rooms.cd.l3': 'Coffee machine in the room',
  'film.eyebrow': 'The film', 'film.title': 'Casa Weber in 40 seconds.',
  'film.lead': 'Turn the sound on, climb the stairs with us and open the bedroom door.',
  'film.sound': 'Play with sound', 'film.aria': 'Casa Weber presentation film', 'film.toggle': 'Sound on / off',
  'rev.eyebrow': 'What guests say', 'rev.title': 'Exceptional, on every count.',
  'rev.word': 'Exceptional', 'rev.src': '363 reviews on Booking.com',
  'rev.b1': 'Cleanliness', 'rev.b2': 'Comfort', 'rev.b3': 'Location', 'rev.b4': 'Hosts', 'rev.b5': 'Value for money',
  'rev.date': 'Scores from Booking.com, November 2026.',
  'rev.q1': '“The location, the room is superb, authentic, full of tastefully chosen objects. The mix of wood and brick is perfect.”',
  'rev.q2': '“We found a place that feels like a real museum, where every piece of period furniture and every architectural detail tells a centuries-old story.”',
  'rev.q3': '“Everything was spotlessly clean and well kept, with great attention to detail. The owner is very helpful, kind and friendly!”',
  'rev.via': '· on Booking.com', 'rev.note': 'Reviews translated from Romanian.', 'rev.all': 'Read all reviews',
  'loc.eyebrow': 'Where to find us', 'loc.title': 'At the foot of the medieval citadel.',
  'loc.lead': 'Cafés and restaurants are right at the door, and the Clock Tower and the old citadel streets are a few steps away.',
  'loc.d1': 'Hermann Oberth Square', 'loc.d2': 'Sighișoara train station', 'loc.d3': 'Saschiz fortified church',
  'loc.d4': 'Biertan fortified church', 'loc.d5': 'Târgu Mureș Airport', 'loc.d6': 'Sibiu Airport',
  'loc.maptitle': 'Google map: Casa Weber, Sighișoara',
  'info.eyebrow': 'Good to know', 'info.title': 'Simple and clear.',
  'info.in': 'Check-in 15:00 – 22:00', 'info.in2': 'Let us know your arrival time in advance.',
  'info.out': 'Check-out 08:00 – 11:00', 'info.out2': 'No rush, have a coffee first.',
  'info.park': 'Free parking', 'info.park2': 'On site.',
  'info.wifi': 'Free WiFi', 'info.wifi2': 'Throughout the house.',
  'info.kids': 'Children welcome', 'info.kids2': 'Free cot on request (0–3 years).',
  'info.rules': 'A quiet house', 'info.rules2': 'No smoking, no pets, no parties.',
  'info.lang': 'We speak Romanian and English', 'info.lang2': 'Your host is happy to share tips about the town.',
  'book.eyebrow': 'Bookings', 'book.title': 'See you in Sighișoara.',
  'book.lead': 'Call us directly or book on Booking.com. We reply quickly.', 'book.booking': 'Book on Booking.com',
  'foot.credit': 'Website & film:',
  'viewer.label': 'Room in 3D', 'viewer.close': 'Close', 'viewer.prev': 'Previous photo', 'viewer.next': 'Next photo',
  'viewer.hint': 'Drag with your finger or mouse to look around',
};

let lang = document.documentElement.dataset.lang || 'ro';

function applyLang(l) {
  lang = l;
  const root = document.documentElement;
  root.lang = l === 'en' ? 'en' : 'ro';
  root.dataset.lang = l;
  root.classList.remove('lang-ro', 'lang-en');
  root.classList.add('lang-' + l);
  $$('[data-i18n]').forEach((el) => {
    if (el.dataset.ro === undefined) el.dataset.ro = el.textContent;
    const k = el.dataset.i18n;
    el.textContent = l === 'en' && EN[k] !== undefined ? EN[k] : el.dataset.ro;
  });
  $$('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, k] = pair.split(':');
      const store = 'ro_' + attr.replace(/[^a-z]/gi, '');
      if (el.dataset[store] === undefined) el.dataset[store] = el.getAttribute(attr) || '';
      el.setAttribute(attr, l === 'en' && EN[k] !== undefined ? EN[k] : el.dataset[store]);
    });
  });
  $$('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === l)));
  document.title = l === 'en' ? 'Casa Weber · Guesthouse in Sighișoara, at the foot of the citadel' : 'Casa Weber · Cazare în Sighișoara, la poalele cetății';
  try { localStorage.setItem('cw-lang', l); } catch (e) { /* fara memorie locala: limba ramane doar pe pagina asta */ }
  if (viewerState.items) updateViewerTitle();
}
$$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.setLang)));

// ------------------------------------------------------------ antet: transparent peste tur, crem peste restul
const head = $('.top');
const tur = $('#tur');
function headState() {
  const r = tur.getBoundingClientRect();
  head.classList.toggle('solid', r.bottom <= head.offsetHeight + 1);
}
addEventListener('scroll', headState, { passive: true });
addEventListener('resize', headState);

// ------------------------------------------------------------ aparitii + parallax usor
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el) => io.observe(el));

const parEls = $$('[data-par]');
const bookImg = $('.book-bg img');
function parallax() {
  if (RM) return;
  const h = innerHeight;
  parEls.forEach((el) => {
    const r = el.parentElement.getBoundingClientRect();
    const c = (r.top + r.height / 2 - h / 2);
    el.style.transform = `translate3d(0, ${(c * parseFloat(el.dataset.par)).toFixed(1)}px, 0)`;
  });
  if (bookImg) {
    const r = bookImg.parentElement.parentElement.getBoundingClientRect();
    if (r.bottom > 0 && r.top < h) bookImg.style.transform = `translate3d(0, ${((r.top + r.height / 2 - h / 2) * -0.08).toFixed(1)}px, 0) scale(1.04)`;
  }
}
addEventListener('scroll', () => requestAnimationFrame(parallax), { passive: true });

// ------------------------------------------------------------ film: porneste fara sunet cand ajungi la el
const film = $('#film');
const video = $('.film-video');
let userPaused = false;
function setSound(on) {
  video.muted = !on;
  film.classList.toggle('sound', on);
  if (on) { video.currentTime = video.currentTime > 1 ? video.currentTime : 0; video.play().catch(() => {}); }
}
new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) {
    if (video.preload !== 'auto') { video.preload = 'auto'; }
    if (!userPaused && !RM) video.play().catch(() => {});
  } else if (!video.paused) { video.pause(); }
}), { threshold: 0.35 }).observe(video);
$('[data-film-sound]').addEventListener('click', () => { userPaused = false; video.currentTime = 0; setSound(true); });
$('[data-film-toggle]').addEventListener('click', (e) => { e.stopPropagation(); setSound(video.muted); });
video.addEventListener('click', () => {
  if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); }
});

// ------------------------------------------------------------ harta: se incarca doar cand ajungi la ea
const mapFrame = $('.map iframe');
new IntersectionObserver((es, o) => es.forEach((e) => {
  if (e.isIntersecting) { mapFrame.src = mapFrame.dataset.src + (lang === 'en' ? '&hl=en' : '&hl=ro'); o.disconnect(); }
}), { rootMargin: '400px' }).observe(mapFrame);

$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// ------------------------------------------------------------ vizualizatorul 3D al camerelor
const ROOMS = {
  ap: ['ap1', 'ap2', 'ap3', 'ap4'],
  ma: ['ma1', 'ma2', 'ma3', 'ma4'],
  cd: ['cd1', 'cd2', 'cd3', 'cd4'],
};
const dialog = $('#viewer');
const viewer = new Viewer3D(dialog);
const viewerState = { room: null, items: null, idx: 0 };
const thumbs = $('[data-viewer-thumbs]');

function updateViewerTitle() {
  const card = $(`[data-room="${viewerState.room}"] h3`);
  $('[data-viewer-title]').textContent = card ? card.textContent : '';
  $('[data-viewer-count]').textContent = `${viewerState.idx + 1} / ${viewerState.items.length}`;
}

function openRoom(room, opener) {
  viewerState.room = room;
  viewerState.opener = opener;
  viewerState.items = ROOMS[room].map((k) => ({ img: `camere/${k}.jpg`, depth: `camere/${k}-d.png` }));
  thumbs.innerHTML = '';
  viewerState.items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `${i + 1}`);
    b.innerHTML = `<img src="${it.img}" alt="" loading="lazy">`;
    b.addEventListener('click', () => viewer.show(i));
    thumbs.appendChild(b);
  });
  $('.viewer-stage').classList.remove('touched');
  viewer.open(viewerState.items, 0, (i, it) => {
    viewerState.idx = i;
    $$('button', thumbs).forEach((b, k) => b.classList.toggle('on', k === i));
    $('[data-viewer-flat]').src = it.img;
    updateViewerTitle();
  });
}
$$('[data-open-3d]').forEach((b) => b.addEventListener('click', () => openRoom(b.getAttribute('data-open-3d'), b)));
$('[data-viewer-prev]').addEventListener('click', () => viewer.show(viewerState.idx - 1));
$('[data-viewer-next]').addEventListener('click', () => viewer.show(viewerState.idx + 1));
$('[data-viewer-close]').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') viewer.show(viewerState.idx + 1);
  if (e.key === 'ArrowLeft') viewer.show(viewerState.idx - 1);
});
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { viewerState.opener && viewerState.opener.focus({ preventScroll: true }); });
$('.viewer-stage').addEventListener('pointerdown', () => $('.viewer-stage').classList.add('touched'));

// ------------------------------------------------------------ pornire
applyLang(lang);
headState();
parallax();
initTour(tur);
window.__cw = { applyLang };
