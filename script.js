// Dedicated mobile stylesheet shared by every page.
if (!document.querySelector('link[data-mobile-styles]')) {
  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'mobile.css?v=20261015-1';
  mobileStyles.dataset.mobileStyles = 'true';
  document.head.appendChild(mobileStyles);
}

// Temporary public contact email used across the entire site.
const publicEmail = 'xxx@xxx.xxx';
document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
  const href = link.getAttribute('href') || '';
  link.setAttribute('href', href.replace(/abolo@bk\.ru/gi, publicEmail));
  if (link.textContent) {
    link.textContent = link.textContent.replace(/abolo@bk\.ru/gi, publicEmail);
  }
});
const emailTextWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
let emailTextNode;
while ((emailTextNode = emailTextWalker.nextNode())) {
  if (/abolo@bk\.ru/i.test(emailTextNode.nodeValue || '')) {
    emailTextNode.nodeValue = emailTextNode.nodeValue.replace(/abolo@bk\.ru/gi, publicEmail);
  }
}

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


// Home page catalog search
(() => {
  const root = document.querySelector('[data-site-search]');
  if (!root) return;

  const form = root.querySelector('[data-site-search-form]');
  const input = root.querySelector('[data-site-search-input]');
  const results = root.querySelector('[data-site-search-results]');
  const hintButtons = root.querySelectorAll('[data-search-query]');

  const pages = [
    {title:'Герб Российской Федерации', meta:'Каталог · Герб РФ', url:'gerb-rf.html', keys:'герб россии российской федерации рф государственный'},
    {title:'Герб России без щита', meta:'Варианты исполнения', url:'gerb-rf-bez-shchita.html', keys:'без щита орел двуглавый'},
    {title:'Герб России без щита — барельеф', meta:'Барельеф', url:'gerb-rf-barelef.html', keys:'без щита барельеф рельеф'},
    {title:'Герб России без щита — горельеф', meta:'Горельеф', url:'gerb-rf-gorelef.html', keys:'без щита горельеф глубокий рельеф'},
    {title:'Герб России без щита — покрытие краской', meta:'Барельеф · Краска', url:'gerb-rf-barelef-kraska.html', keys:'без щита краска окрашенный барельеф'},
    {title:'Герб России без щита — металлизация', meta:'Барельеф · Металлизация', url:'gerb-rf-barelef-metallizaciya.html', keys:'без щита металлизация золотой барельеф'},
    {title:'Герб России на щите', meta:'Варианты исполнения', url:'gerb-rf-na-shchite.html', keys:'на щите щит'},
    {title:'Герб России на щите — барельеф', meta:'Барельеф', url:'gerb-rf-na-shchite-barelef.html', keys:'на щите барельеф'},
    {title:'Герб России на щите — горельеф', meta:'Горельеф', url:'gerb-rf-na-shchite-gorelef.html', keys:'на щите горельеф'},
    {title:'Барельеф на щите — покрытие краской', meta:'Выбор материала щита', url:'gerb-rf-na-shchite-barelef-kraska.html', keys:'краска на щите барельеф материал'},
    {title:'Герб России на бархатном щите', meta:'Краска · Бархат', url:'gerb-rf-na-shchite-barelef-kraska-barhat.html', keys:'бархат бархатный флок композит краска'},
    {title:'Герб России на пластиковом щите', meta:'Краска · Пластик', url:'gerb-rf-na-shchite-barelef-kraska-plastik.html', keys:'пластик пластиковый краска'},
    {title:'Герб России на металлическом щите', meta:'Краска · Металл', url:'gerb-rf-na-shchite-barelef-kraska-metall.html', keys:'металл металлический краска'},
    {title:'Барельеф на щите — металлизация', meta:'Выбор материала щита', url:'gerb-rf-na-shchite-barelef-metallizaciya.html', keys:'металлизация на щите материал'},
    {title:'Герб России на бархатном щите — металлизация', meta:'Металлизация · Бархат', url:'gerb-rf-na-shchite-barelef-metallizaciya-barhat.html', keys:'металлизация бархат бархатный флок'},
    {title:'Герб России на пластиковом щите — металлизация', meta:'Металлизация · Пластик', url:'gerb-rf-na-shchite-barelef-metallizaciya-plastik.html', keys:'металлизация пластик пластиковый'}
  ];

  const normalize = value => String(value || '')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g,'е')
    .replace(/[^a-zа-я0-9]+/gi,' ')
    .trim();

  const rankPages = query => {
    const q = normalize(query);
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);

    return pages.map(page => {
      const title = normalize(page.title);
      const haystack = normalize(page.title + ' ' + page.meta + ' ' + page.keys);
      let score = 0;
      if (title === q) score += 100;
      if (title.startsWith(q)) score += 45;
      if (haystack.includes(q)) score += 30;
      words.forEach(word => {
        if (title.includes(word)) score += 12;
        else if (haystack.includes(word)) score += 6;
      });
      return {page, score};
    }).filter(item => item.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0,6)
      .map(item => item.page);
  };

  const render = query => {
    const matches = rankPages(query);
    if (!normalize(query)) {
      results.hidden = true;
      results.innerHTML = '';
      return matches;
    }

    if (!matches.length) {
      results.innerHTML = '<div class="home-search-empty">Ничего не нашли. Попробуйте: «без щита», «барельеф», «металлизация» или «пластиковый щит».</div>';
      results.hidden = false;
      return matches;
    }

    results.innerHTML = matches.map(page =>
      '<a class="home-search-result" href="' + page.url + '">' +
        '<span><strong>' + page.title + '</strong><small>' + page.meta + '</small></span>' +
        '<span aria-hidden="true">→</span>' +
      '</a>'
    ).join('');
    results.hidden = false;
    return matches;
  };

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('focus', () => {
    if (normalize(input.value)) render(input.value);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const matches = rankPages(input.value);
    if (matches.length) window.location.href = matches[0].url;
    else render(input.value);
  });

  hintButtons.forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.searchQuery || '';
      input.focus();
      render(input.value);
    });
  });

  document.addEventListener('click', event => {
    if (!root.contains(event.target)) results.hidden = true;
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      results.hidden = true;
      input.blur();
    }
  });
})();
