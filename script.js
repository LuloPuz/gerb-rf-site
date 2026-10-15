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

// На финальных карточках: клик по увеличенному фото показывает следующее фото галереи.
function cycleLightboxImage(step = 1) {
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxImage = document.querySelector('[data-lightbox-image]');
  if (!lightbox || !lightboxImage || !lightbox.classList.contains('open')) return;

  const thumbs = Array.from(document.querySelectorAll('.gallery-thumb[data-src]'));
  if (thumbs.length < 2) return;

  const urls = thumbs.map(button => new URL(button.dataset.src, document.baseURI).href);
  const currentUrl = new URL(lightboxImage.src, document.baseURI).href;
  let currentIndex = urls.findIndex(url => url === currentUrl);
  if (currentIndex < 0) currentIndex = 0;

  const nextIndex = (currentIndex + step + thumbs.length) % thumbs.length;
  const nextButton = thumbs[nextIndex];
  const nextUrl = urls[nextIndex];

  lightboxImage.src = nextUrl;

  const mainImage = document.querySelector('[data-gallery-main]');
  if (mainImage) mainImage.src = nextUrl;

  thumbs.forEach(button => button.classList.remove('active'));
  nextButton.classList.add('active');
}

const lightboxImageForCycling = document.querySelector('[data-lightbox-image]');
if (lightboxImageForCycling) {
  lightboxImageForCycling.style.cursor = 'pointer';
  lightboxImageForCycling.title = 'Нажмите, чтобы посмотреть следующее фото';
  lightboxImageForCycling.addEventListener('click', event => {
    event.stopPropagation();
    cycleLightboxImage(1);
  });
}

document.addEventListener('keydown', event => {
  const lightbox = document.querySelector('[data-lightbox]');
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (event.key === 'ArrowRight') cycleLightboxImage(1);
  if (event.key === 'ArrowLeft') cycleLightboxImage(-1);
});
