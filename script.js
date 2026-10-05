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

// Hero background: use a new asset name to bypass GitHub Pages/CDN caching.
const hero = document.querySelector('.hero');
if (hero) {
  hero.style.backgroundImage = "linear-gradient(90deg, #07182a 0%, rgba(7,24,42,.98) 30%, rgba(7,24,42,.76) 46%, rgba(7,24,42,.28) 63%, rgba(7,24,42,0) 78%), url('./assets/hero-office-v2.webp?v=20261005-2')";
  hero.style.backgroundRepeat = 'no-repeat';
  hero.style.backgroundSize = 'cover';
  hero.style.backgroundPosition = 'center center';
}
