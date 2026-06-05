'use strict';

// ── Navbar scroll effect ────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile hamburger ────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  })
);

// ── Smooth scroll ───────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-h'), 10) || 72;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  });
});

// ── Scroll animations ───────────────────────────────────
// Gate hidden state behind body.anim-ready so content is always
// visible if JS fails or the observer never fires (GitHub Pages etc.)
document.body.classList.add('anim-ready');

const ANIM_SELECTOR = '.fade-in, .slide-in-left, .slide-in-right, .event-card, .album-btn, .join-feature';

const obs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const parent = entry.target.closest('.events-grid, .albums-grid, .join-features');
    const delay  = parent ? [...parent.children].indexOf(entry.target) * 70 : 0;
    setTimeout(() => entry.target.classList.add('visible'), delay);
    obs.unobserve(entry.target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

document.querySelectorAll(ANIM_SELECTOR).forEach(el => obs.observe(el));

// Reveal anything already visible in the initial viewport (no scroll needed)
function revealInView() {
  document.querySelectorAll(ANIM_SELECTOR).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('visible');
    }
  });
}
revealInView();
// Run again after fonts/images finish layout shifts
window.addEventListener('load', revealInView);

// ── Active nav highlight ────────────────────────────────
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll('.nav-link').forEach(a => {
      a.style.color = a.getAttribute('href') === '#' + entry.target.id ? 'var(--gold)' : '';
    });
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('section[id]').forEach(s => sectionObs.observe(s));

// ── Contact form ────────────────────────────────────────
const form    = document.getElementById('contact-form');
const success = document.getElementById('form-success');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    setTimeout(() => {
      form.reset(); success.hidden = false;
      btn.disabled = false; btn.textContent = 'Send Message';
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 900);
  });
}

// ══════════════════════════════════════════════════════
// EVENT PHOTO ALBUMS + LIGHTBOX
// ══════════════════════════════════════════════════════

const ALBUMS = {
  diwali: {
    name: 'Diwali — Festival of Lights',
    icon: '🪔',
    photos: [
      { src: 'images/events/diwali.jpg', caption: 'Diwali 2024' }
    ]
  },
  holi: {
    name: 'Holi — Festival of Colors',
    icon: '🎨',
    photos: [
      { src: 'images/events/holi.jpg',           caption: 'Holi' },
      { src: 'images/2026/holi/holi_01.jpg',      caption: 'Holi 2026' },
      { src: 'images/2026/holi/holi_02.jpg',      caption: 'Holi 2026' },
      { src: 'images/2026/holi/holi_03.PNG',      caption: 'Holi 2026' }
    ]
  },
  summer: {
    name: 'Summer Festival',
    icon: '☀️',
    photos: [
      { src: 'images/events/summer-fest.jpg', caption: 'Summer Festival' }
    ]
  },
  cricket: {
    name: 'Cricket for Ladies & Kids',
    icon: '🏏',
    photos: [
      { src: 'images/events/cricket.jpg', caption: 'Cricket' }
    ]
  },
  sports: {
    name: 'Family Sports Day',
    icon: '🏅',
    photos: [
      { src: 'images/events/sports.jpg', caption: 'Sports Day' }
    ]
  },
  food: {
    name: 'Indian Street Food Festival',
    icon: '🍛',
    photos: [
      { src: 'images/events/food-festival.jpg', caption: 'Food Festival' }
    ]
  }
};

// Populate photo-count badges
document.querySelectorAll('.album-count[data-count]').forEach(badge => {
  const album = ALBUMS[badge.dataset.count];
  if (!album) return;
  const n = album.photos.length;
  badge.textContent = n === 1 ? '1 photo' : `${n} photos`;
});

// ── Lightbox state ──────────────────────────────────────
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lb-img');
const lbTitle   = document.getElementById('lb-title');
const lbIcon    = document.getElementById('lb-album-icon');
const lbCounter = document.getElementById('lb-counter');
const lbThumbs  = document.getElementById('lb-thumbs');
const lbPrev    = document.getElementById('lb-prev');
const lbNext    = document.getElementById('lb-next');
const lbClose   = document.getElementById('lb-close');
const lbSpinner = document.getElementById('lb-spinner');
const lbBackdrop= document.getElementById('lb-backdrop');
const lbImgWrap = document.getElementById('lb-img-wrap');

let currentAlbum  = null;
let currentIndex  = 0;

function openAlbum(albumId, startIndex = 0) {
  const album = ALBUMS[albumId];
  if (!album) return;
  currentAlbum = album;
  currentIndex = startIndex;

  lbTitle.textContent = album.name;
  lbIcon.textContent  = album.icon;

  // Build thumbnail strip
  lbThumbs.innerHTML = '';
  if (album.photos.length > 1) {
    album.photos.forEach((photo, i) => {
      const thumb = document.createElement('button');
      thumb.className = 'lb-thumb' + (i === startIndex ? ' active' : '');
      thumb.setAttribute('aria-label', `Photo ${i + 1}`);
      thumb.innerHTML = `<img src="${photo.src}" alt="${photo.caption}" loading="lazy">`;
      thumb.addEventListener('click', () => showPhoto(i));
      lbThumbs.appendChild(thumb);
    });
  }

  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  showPhoto(startIndex, false);
  lbClose.focus();
}

function showPhoto(index, animate = true) {
  const album  = currentAlbum;
  const photo  = album.photos[index];
  currentIndex = index;

  // Update nav buttons
  lbPrev.disabled = index === 0;
  lbNext.disabled = index === album.photos.length - 1;

  // Update counter
  lbCounter.textContent = album.photos.length > 1
    ? `${index + 1} / ${album.photos.length}` : '';

  // Update active thumbnail
  lbThumbs.querySelectorAll('.lb-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
  // Scroll active thumb into view
  const activeThumb = lbThumbs.querySelector('.lb-thumb.active');
  if (activeThumb) activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

  // Load image with spinner
  lbSpinner.classList.add('active');
  if (animate) lbImg.classList.add('loading');

  const tmpImg  = new Image();
  tmpImg.onload = () => {
    lbImg.src = photo.src;
    lbImg.alt = photo.caption;
    lbImg.classList.remove('loading');
    lbSpinner.classList.remove('active');
  };
  tmpImg.onerror = () => {
    lbImg.src = photo.src;
    lbImg.classList.remove('loading');
    lbSpinner.classList.remove('active');
  };
  tmpImg.src = photo.src;
}

function closeAlbum() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  currentAlbum = null;
}

function navigate(dir) {
  if (!currentAlbum) return;
  const next = currentIndex + dir;
  if (next >= 0 && next < currentAlbum.photos.length) showPhoto(next);
}

// Album button clicks
document.querySelectorAll('.album-btn[data-album]').forEach(btn => {
  btn.addEventListener('click', () => openAlbum(btn.dataset.album));
});

// Lightbox controls
lbPrev.addEventListener('click', () => navigate(-1));
lbNext.addEventListener('click', () => navigate(+1));
lbClose.addEventListener('click', closeAlbum);
lbBackdrop.addEventListener('click', closeAlbum);

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape')      closeAlbum();
  if (e.key === 'ArrowLeft')   navigate(-1);
  if (e.key === 'ArrowRight')  navigate(+1);
});

// Touch / swipe support
let touchStartX = 0;
lbImgWrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
lbImgWrap.addEventListener('touchend',   e => {
  const delta = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(delta) > 40) navigate(delta > 0 ? 1 : -1);
}, { passive: true });
