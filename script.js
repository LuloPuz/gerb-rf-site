const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Rebuild the approved high-resolution hero image from static chunks.
// This avoids the heavy compression that made the previous background look blurry.
const hero = document.querySelector('.hero');
if (hero) {
  Promise.all([
    fetch('./assets/hero-hq65-01.txt?v=20261005-hq3').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 1: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-02.txt?v=20261005-hq3').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 2: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-03.txt?v=20261005-hq3').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 3: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-04.txt?v=20261005-hq3').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 4: ${r.status}`);
      return r.text();
    })
  ]).then(parts => {
    const base64 = parts.join('').replace(/\s/g, '');
    const image = `data:image/avif;base64,${base64}`;

    hero.style.backgroundImage = `linear-gradient(90deg, rgba(7,24,42,.58) 0%, rgba(7,24,42,.40) 30%, rgba(7,24,42,.12) 48%, rgba(7,24,42,0) 62%), url("${image}")`;
    hero.style.backgroundRepeat = 'no-repeat';
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center center';
  }).catch(err => {
    console.error('HQ hero image failed to load', err);
  });
}
