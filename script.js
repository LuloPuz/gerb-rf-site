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

// Rebuild the hero image from static chunks.
const hero = document.querySelector('.hero');
if (hero) {
  Promise.all([
    fetch('./assets/hero-hq65-01.txt?v=20261005-hq4').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 1: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-02.txt?v=20261005-hq4').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 2: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-03.txt?v=20261005-hq4').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 3: ${r.status}`);
      return r.text();
    }),
    fetch('./assets/hero-hq65-04.txt?v=20261005-hq4').then(r => {
      if (!r.ok) throw new Error(`Hero chunk 4: ${r.status}`);
      return r.text();
    })
  ]).then(parts => {
    let base64 = parts.join('').replace(/\s/g, '');
    while (base64.length % 4 !== 0) base64 += '=';

    const image = `data:image/avif;base64,${base64}`;
    const testImage = new Image();
    testImage.onload = () => {
      hero.style.backgroundImage = `linear-gradient(90deg, rgba(7,24,42,.70) 0%, rgba(7,24,42,.52) 30%, rgba(7,24,42,.20) 48%, rgba(7,24,42,0) 64%), url("${image}")`;
      hero.style.backgroundRepeat = 'no-repeat';
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center center';
    };
    testImage.onerror = () => {
      console.error('Decoded hero image is invalid');
      hero.style.backgroundImage = "linear-gradient(90deg, rgba(7,24,42,.78) 0%, rgba(7,24,42,.56) 34%, rgba(7,24,42,.14) 58%, rgba(7,24,42,0) 72%), url('./assets/hero-office-v2.webp?v=20261005-fallback')";
      hero.style.backgroundRepeat = 'no-repeat';
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center center';
    };
    testImage.src = image;
  }).catch(err => {
    console.error('HQ hero image failed to load', err);
    hero.style.backgroundImage = "linear-gradient(90deg, rgba(7,24,42,.78) 0%, rgba(7,24,42,.56) 34%, rgba(7,24,42,.14) 58%, rgba(7,24,42,0) 72%), url('./assets/hero-office-v2.webp?v=20261005-fallback')";
    hero.style.backgroundRepeat = 'no-repeat';
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center center';
  });
}
