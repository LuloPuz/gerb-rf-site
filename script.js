// Critical header styles: prevent unstyled menu/account/cart flash before shop.css loads.
(() => {
  if (document.querySelector('[data-static-header]') || document.getElementById('derzhava-critical-header-css')) return;
  const style=document.createElement('style');
  style.id='derzhava-critical-header-css';
  style.textContent=`
    .site-menu-toggle,.site-quick-overlay,.site-quick-menu{display:none}
    .shop-header-actions{display:flex;align-items:center;gap:3px;margin-left:4px;padding-left:17px;border-left:1px solid rgba(7,24,42,.09)}
    .shop-header-link{position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;box-sizing:border-box;border:0;border-radius:50%;background:transparent;color:#273542;text-decoration:none}
    .shop-header-link svg{display:block;width:21px!important;height:21px!important;max-width:21px!important;max-height:21px!important;fill:none;stroke:currentColor;stroke-width:1.45}
    .shop-header-label{font-size:0;line-height:0}
    .shop-cart-count{position:absolute;right:-2px;top:0;display:grid;place-items:center;min-width:19px;height:19px;padding:0 4px;box-sizing:border-box;border:2px solid #fbfaf6;border-radius:9px;background:#c89f51;color:#07182a;font:600 9px/1 Arial,sans-serif}
    .shop-cart-count[data-empty="true"]{display:none}
    @media(max-width:720px){
      .shop-header-actions{margin-left:0;padding-left:0;border-left:0}
    }
  `;
  document.head.appendChild(style);
})();

// Unified compact site header
(() => {
  const header=document.querySelector('.header-inner');
  if(!header) return;

  const brand=header.querySelector('.brand');
  if(brand){
    brand.setAttribute('href','index.html');
    brand.setAttribute('aria-label','На главную');
  }

  header.querySelector('.nav-toggle')?.remove();
  header.querySelector('.header-cta')?.remove();

  let nav=header.querySelector('.main-nav');
  if(!nav){
    nav=document.createElement('nav');
    nav.className='main-nav';
    header.appendChild(nav);
  }

  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const isHome=path===''||path==='index.html';
  nav.setAttribute('aria-label','Основная навигация');
  if(!header.hasAttribute('data-static-header')) nav.innerHTML=
    '<a href="'+(isHome?'#production':'index.html#production')+'">Производство</a>'+
    '<a href="'+(isHome?'#contacts':'index.html#contacts')+'">Контакты</a>';

  const footer=document.querySelector('.site-footer');
  if(footer && !footer.id) footer.id='contacts';

  if(!header.querySelector('[data-header-site-search]')){
    const search=document.createElement('div');
    search.className='header-site-search';
    search.dataset.headerSiteSearch='';
    search.setAttribute('data-site-search','');
    search.innerHTML=
      '<div class="home-search-ui">'+
        '<form class="home-search-form" data-site-search-form role="search">'+
          '<span class="home-search-icon" aria-hidden="true">'+
            '<svg viewBox="0 0 24 24" width="21" height="21" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.2 4.2"></path></svg>'+
          '</span>'+
          '<input class="home-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Поиск: Герб России, Москва, МВД…" aria-label="Поиск по сайту" data-site-search-input>'+
          '<button class="home-search-submit" type="submit">Найти</button>'+
        '</form>'+
        '<div class="home-search-results" data-site-search-results hidden></div>'+
      '</div>';
    header.insertBefore(search,nav);
  }

  const menuButton=header.querySelector('.site-menu-toggle')||document.createElement('button');
  const existingMenu=menuButton.isConnected;
  menuButton.className='site-menu-toggle';
  menuButton.type='button';
  menuButton.setAttribute('aria-label','Открыть меню');
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-controls','siteQuickMenu');
  if(!existingMenu) menuButton.innerHTML=
    '<span class="site-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>'+
    '<span class="site-menu-label">Меню</span>';
  if(!existingMenu) header.insertBefore(menuButton,header.querySelector('[data-header-site-search]')||nav);

  document.querySelector('.site-quick-overlay')?.remove();
  document.querySelector('.site-quick-menu')?.remove();

  const overlay=document.createElement('button');
  overlay.className='site-quick-overlay';
  overlay.type='button';
  overlay.setAttribute('aria-label','Закрыть меню');

  const panel=document.createElement('aside');
  panel.className='site-quick-menu';
  panel.id='siteQuickMenu';
  panel.setAttribute('aria-hidden','true');
  panel.innerHTML=
    '<div class="site-quick-head">'+
      '<div><small>Быстрый переход</small><strong>Разделы сайта</strong></div>'+
      '<button class="site-quick-close" type="button" aria-label="Закрыть меню">×</button>'+
    '</div>'+
    '<nav class="site-quick-links" aria-label="Быстрый переход по сайту">'+
      '<a href="catalog.html"><span>Весь каталог</span><small>Все товары и разделы</small></a>'+
      '<a href="catalog.html#popular"><span>Популярное</span><small>Готовые исполнения с фото</small></a>'+
      '<a href="gerb-rf.html"><span>Герб Российской Федерации</span></a>'+
      '<a href="gerb-moskvy.html"><span>Герб Москвы</span></a>'+
      '<a href="gerby-subektov-rf.html"><span>Субъекты и города РФ</span></a>'+
      '<a href="emblemy-vedomstv-rf.html"><span>Ведомства РФ</span></a>'+
      '<a href="index.html#production"><span>Производство</span></a>'+
      '<a href="index.html#contacts"><span>Контакты</span></a>'+
    '</nav>'+
    '<div class="site-quick-account">'+
      '<a href="account.html">Личный кабинет</a>'+
      '<a href="cart.html">Корзина</a>'+
    '</div>';

  document.body.appendChild(overlay);
  document.body.appendChild(panel);

  const setMenu=open=>{
    menuButton.classList.toggle('open',open);
    menuButton.setAttribute('aria-expanded',String(open));
    panel.classList.toggle('open',open);
    panel.setAttribute('aria-hidden',String(!open));
    overlay.classList.toggle('open',open);
    document.body.classList.toggle('site-menu-open',open);
  };

  menuButton.addEventListener('click',()=>setMenu(!panel.classList.contains('open')));
  overlay.addEventListener('click',()=>setMenu(false));
  panel.querySelector('.site-quick-close')?.addEventListener('click',()=>setMenu(false));
  panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape') setMenu(false)});
})();

// Derzhava commerce assets.
// Important: do not start shop.js until shop.css is ready. This prevents FOUC/giant SVG icons.
(() => {
  if(document.querySelector('[data-static-header]')) return;
  const loadRuntime=()=>{
    // Wait until the parser has seen any explicit runtime at the end of the page.
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',loadRuntime,{once:true});
      return;
    }
    if(document.querySelector('script[data-shop-runtime]')) return;
    const shopRuntime=document.createElement('script');
    shopRuntime.src='shop.js?v=20261125-firstauth2';
    shopRuntime.dataset.shopRuntime='true';
    shopRuntime.async=false;
    document.body.appendChild(shopRuntime);
  };

  let shopStyles=document.querySelector('link[data-shop-styles]');
  if(!shopStyles){
    shopStyles=document.createElement('link');
    shopStyles.rel='stylesheet';
    shopStyles.href='shop.css?v=20261125-firstauth2';
    shopStyles.dataset.shopStyles='true';
    shopStyles.addEventListener('load',loadRuntime,{once:true});
    shopStyles.addEventListener('error',loadRuntime,{once:true});
    document.head.appendChild(shopStyles);
  }else if(shopStyles.sheet){
    loadRuntime();
  }else{
    shopStyles.addEventListener('load',loadRuntime,{once:true});
    shopStyles.addEventListener('error',loadRuntime,{once:true});
  }
})();

// Route Moscow links to the Moscow catalog page.
document.querySelectorAll('a[href="index.html#moscow"], a[href="#moscow"]').forEach(link => {
  link.setAttribute('href', 'gerb-moskvy.html');
});

// Dedicated mobile stylesheet shared by every page.
if (!document.querySelector('link[data-mobile-styles]')) {
  const mobileStyles = document.createElement('link');
  mobileStyles.rel = 'stylesheet';
  mobileStyles.href = 'mobile.css?v=20261124-header-search3';
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

  const pages = [{"title":"Весь каталог","meta":"Полный ассортимент","url":"catalog.html","keys":"весь каталог все товары полный ассортимент гербы эмблемы"},{"title":"Герб Российской Федерации","meta":"Каталог · Герб РФ","url":"gerb-rf.html","keys":"герб россии российской федерации рф государственный двуглавый орел"},{"title":"Герб Москвы","meta":"Каталог · Барельеф","url":"gerb-moskvy.html","keys":"герб москвы москва мск московский барельеф"},{"title":"Гербы субъектов и городов Российской Федерации","meta":"Каталог · Субъекты и города РФ","url":"gerby-subektov-rf.html","keys":"гербы субъектов городов рф регионы области республики края автономные округа города российской федерации"},{"title":"Эмблемы ведомств Российской Федерации","meta":"Каталог · Ведомства РФ","url":"emblemy-vedomstv-rf.html","keys":"эмблемы ведомств министерства федеральные службы органы власти мвд мчс фсб минфин"},{"title":"Герб Москвы без щита","meta":"Москва · Барельеф","url":"gerb-moskvy-bez-shchita.html","keys":"герб москвы без щита барельеф"},{"title":"Герб Москвы без щита — покрытие краской","meta":"Москва · Барельеф · Краска","url":"gerb-moskvy-bez-shchita-kraska.html","keys":"герб москвы без щита краска окрашивание окрашенный барельеф"},{"title":"Герб Москвы без щита — металлизация","meta":"Москва · Барельеф · Металлизация","url":"gerb-moskvy-bez-shchita-metallizaciya.html","keys":"герб москвы без щита металлизация металлический металл барельеф"},{"title":"Герб Москвы на щите","meta":"Москва · Барельеф","url":"gerb-moskvy-na-shchite.html","keys":"герб москвы на щите барельеф"},{"title":"Герб Москвы на щите — покрытие краской","meta":"Москва · Барельеф · Краска","url":"gerb-moskvy-na-shchite-kraska.html","keys":"герб москвы на щите краска окрашивание барельеф"},{"title":"Герб Москвы на пластиковом щите — покрытие краской","meta":"Москва · Краска · Пластик","url":"gerb-moskvy-na-shchite-kraska-plastik.html","keys":"герб москвы пластиковый щит пластик краска окрашивание барельеф"},{"title":"Герб Москвы на бархатном щите — покрытие краской","meta":"Москва · Краска · Бархат","url":"gerb-moskvy-na-shchite-kraska-barhat.html","keys":"герб москвы бархатный щит бархат флок краска окрашивание барельеф"},{"title":"Герб Москвы на металлическом щите — покрытие краской","meta":"Москва · Краска · Металл","url":"gerb-moskvy-na-shchite-kraska-metall.html","keys":"герб москвы металлический щит металл краска окрашивание барельеф"},{"title":"Герб Москвы на щите — металлизация","meta":"Москва · Барельеф · Металлизация","url":"gerb-moskvy-na-shchite-metallizaciya.html","keys":"герб москвы на щите металлизация барельеф"},{"title":"Герб Москвы на пластиковом щите — металлизация","meta":"Москва · Металлизация · Пластик","url":"gerb-moskvy-na-shchite-metallizaciya-plastik.html","keys":"герб москвы пластиковый щит пластик металлизация барельеф"},{"title":"Герб Москвы на бархатном щите — металлизация","meta":"Москва · Металлизация · Бархат","url":"gerb-moskvy-na-shchite-metallizaciya-barhat.html","keys":"герб москвы бархатный щит бархат флок металлизация барельеф"},{"title":"Герб Москвы на металлическом щите — металлизация","meta":"Москва · Металлизация · Металл","url":"gerb-moskvy-na-shchite-metallizaciya-metall.html","keys":"герб москвы металлический щит металл металлизация барельеф"},{"title":"Герб России без щита","meta":"Варианты исполнения","url":"gerb-rf-bez-shchita.html","keys":"герб россии рф без щита орел двуглавый"},{"title":"Герб России без щита — барельеф","meta":"Барельеф","url":"gerb-rf-barelef.html","keys":"герб россии рф без щита барельеф рельеф"},{"title":"Герб России без щита — горельеф","meta":"Горельеф","url":"gerb-rf-gorelef.html","keys":"герб россии рф без щита горельеф глубокий рельеф"},{"title":"Герб России без щита — покрытие краской","meta":"Барельеф · Краска","url":"gerb-rf-barelef-kraska.html","keys":"герб россии рф без щита краска окрашенный барельеф"},{"title":"Герб России без щита — металлизация","meta":"Барельеф · Металлизация","url":"gerb-rf-barelef-metallizaciya.html","keys":"герб россии рф без щита металлизация золотой барельеф"},{"title":"Герб России на щите","meta":"Варианты исполнения","url":"gerb-rf-na-shchite.html","keys":"герб россии рф на щите щит"},{"title":"Герб России на щите — барельеф","meta":"Барельеф","url":"gerb-rf-na-shchite-barelef.html","keys":"герб россии рф на щите барельеф"},{"title":"Герб России на щите — горельеф","meta":"Горельеф","url":"gerb-rf-na-shchite-gorelef.html","keys":"герб россии рф на щите горельеф"},{"title":"Барельеф на щите — покрытие краской","meta":"Выбор материала щита","url":"gerb-rf-na-shchite-barelef-kraska.html","keys":"герб россии рф краска на щите барельеф материал"},{"title":"Герб России на бархатном щите","meta":"Краска · Бархат","url":"gerb-rf-na-shchite-barelef-kraska-barhat.html","keys":"герб россии рф бархат бархатный флок композит краска"},{"title":"Герб России на пластиковом щите","meta":"Краска · Пластик","url":"gerb-rf-na-shchite-barelef-kraska-plastik.html","keys":"герб россии рф пластик пластиковый краска"},{"title":"Герб России на металлическом щите","meta":"Краска · Металл","url":"gerb-rf-na-shchite-barelef-kraska-metall.html","keys":"герб россии рф металл металлический краска"},{"title":"Барельеф на щите — металлизация","meta":"Выбор материала щита","url":"gerb-rf-na-shchite-barelef-metallizaciya.html","keys":"герб россии рф металлизация на щите материал"},{"title":"Герб России на бархатном щите — металлизация","meta":"Металлизация · Бархат","url":"gerb-rf-na-shchite-barelef-metallizaciya-barhat.html","keys":"герб россии рф металлизация бархат бархатный флок"},{"title":"Герб России на пластиковом щите — металлизация","meta":"Металлизация · Пластик","url":"gerb-rf-na-shchite-barelef-metallizaciya-plastik.html","keys":"герб россии рф металлизация пластик пластиковый"},{"title":"Герб России на металлическом щите — металлизация","meta":"Металлизация · Металл","url":"gerb-rf-na-shchite-barelef-metallizaciya-metall.html","keys":"герб россии рф металлизация металл металлический"},{"title":"Герб Агинского Бурятского автономного округа","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%90%D0%B3%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%91%D1%83%D1%80%D1%8F%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3","keys":"агинский бурятский автономный округ Агинский Бурятский автономный округ Автономный округ герб субъект регион город россия рф"},{"title":"Герб Республики Адыгея","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%90%D0%B4%D1%8B%D0%B3%D0%B5%D1%8F","keys":"адыгея Адыгея Республика герб субъект регион город россия рф"},{"title":"Герб Республики Алтай","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%90%D0%BB%D1%82%D0%B0%D0%B9","keys":"алтай Алтай Республика герб субъект регион город россия рф"},{"title":"Герб Алтайского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%90%D0%BB%D1%82%D0%B0%D0%B9%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"алтайский край Алтайский край Край герб субъект регион город россия рф"},{"title":"Герб Амурской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%90%D0%BC%D1%83%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"амурская область Амурская область Область герб субъект регион город россия рф"},{"title":"Герб Архангельской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%90%D1%80%D1%85%D0%B0%D0%BD%D0%B3%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"архангельская область Архангельская область Область герб субъект регион город россия рф"},{"title":"Герб Астраханской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%90%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"астраханская область Астраханская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Башкортостан","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%91%D0%B0%D1%88%D0%BA%D0%BE%D1%80%D1%82%D0%BE%D1%81%D1%82%D0%B0%D0%BD","keys":"башкортостан Башкортостан Республика герб субъект регион город россия рф"},{"title":"Герб Белгородской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"белгородская область Белгородская область Область герб субъект регион город россия рф"},{"title":"Герб Брянской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%91%D1%80%D1%8F%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"брянская область Брянская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Бурятия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%91%D1%83%D1%80%D1%8F%D1%82%D0%B8%D1%8F","keys":"бурятия Бурятия Республика герб субъект регион город россия рф"},{"title":"Герб Владимирской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%92%D0%BB%D0%B0%D0%B4%D0%B8%D0%BC%D0%B8%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"владимирская область Владимирская область Область герб субъект регион город россия рф"},{"title":"Герб Волгоградской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%92%D0%BE%D0%BB%D0%B3%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"волгоградская область Волгоградская область Область герб субъект регион город россия рф"},{"title":"Герб Вологодской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%92%D0%BE%D0%BB%D0%BE%D0%B3%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"вологодская область Вологодская область Область герб субъект регион город россия рф"},{"title":"Герб Воронежской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%B5%D0%B6%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"воронежская область Воронежская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Дагестан","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%94%D0%B0%D0%B3%D0%B5%D1%81%D1%82%D0%B0%D0%BD","keys":"дагестан Дагестан Республика герб субъект регион город россия рф"},{"title":"Герб Еврейской автономной области","meta":"Субъекты и города РФ · Автономная область","url":"gerby-subektov-rf.html?q=%D0%95%D0%B2%D1%80%D0%B5%D0%B9%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"еврейская автономная область Еврейская автономная область Автономная область герб субъект регион город россия рф"},{"title":"Герб Забайкальского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%97%D0%B0%D0%B1%D0%B0%D0%B9%D0%BA%D0%B0%D0%BB%D1%8C%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"забайкальский край Забайкальский край Край герб субъект регион город россия рф"},{"title":"Герб Ивановской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"ивановская область Ивановская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Ингушетия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%98%D0%BD%D0%B3%D1%83%D1%88%D0%B5%D1%82%D0%B8%D1%8F","keys":"ингушетия Ингушетия Республика герб субъект регион город россия рф"},{"title":"Герб Иркутской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%98%D1%80%D0%BA%D1%83%D1%82%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"иркутская область Иркутская область Область герб субъект регион город россия рф"},{"title":"Герб Кабардино-Балкарской Республики","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D0%B1%D0%B0%D1%80%D0%B4%D0%B8%D0%BD%D0%BE-%D0%91%D0%B0%D0%BB%D0%BA%D0%B0%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0","keys":"кабардино-балкарская республика Кабардино-Балкарская Республика Республика герб субъект регион город россия рф"},{"title":"Герб Калининградской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D0%BB%D0%B8%D0%BD%D0%B8%D0%BD%D0%B3%D1%80%D0%B0%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"калининградская область Калининградская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Калмыкия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D0%BB%D0%BC%D1%8B%D0%BA%D0%B8%D1%8F","keys":"калмыкия Калмыкия Республика герб субъект регион город россия рф"},{"title":"Герб Калужской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D0%BB%D1%83%D0%B6%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"калужская область Калужская область Область герб субъект регион город россия рф"},{"title":"Герб Камчатского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D0%BC%D1%87%D0%B0%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"камчатский край Камчатский край Край герб субъект регион город россия рф"},{"title":"Герб Карачаево-Черкесской Республики","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D1%80%D0%B0%D1%87%D0%B0%D0%B5%D0%B2%D0%BE-%D0%A7%D0%B5%D1%80%D0%BA%D0%B5%D1%81%D1%81%D0%BA%D0%B0%D1%8F%20%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0","keys":"карачаево-черкесская республика Карачаево-Черкесская Республика Республика герб субъект регион город россия рф"},{"title":"Герб Республики Карелия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B0%D1%80%D0%B5%D0%BB%D0%B8%D1%8F","keys":"карелия Карелия Республика герб субъект регион город россия рф"},{"title":"Герб Кемеровской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B5%D0%BC%D0%B5%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"кемеровская область Кемеровская область Область герб субъект регион город россия рф"},{"title":"Герб Кировской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D0%B8%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"кировская область Кировская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Коми","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9A%D0%BE%D0%BC%D0%B8","keys":"коми Коми Республика герб субъект регион город россия рф"},{"title":"Герб Костромской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D0%BE%D1%81%D1%82%D1%80%D0%BE%D0%BC%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"костромская область Костромская область Область герб субъект регион город россия рф"},{"title":"Герб Краснодарского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"краснодарский край Краснодарский край Край герб субъект регион город россия рф"},{"title":"Герб Красноярского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D1%8F%D1%80%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"красноярский край Красноярский край Край герб субъект регион город россия рф"},{"title":"Герб Курганской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D1%83%D1%80%D0%B3%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"курганская область Курганская область Область герб субъект регион город россия рф"},{"title":"Герб Курской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9A%D1%83%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"курская область Курская область Область герб субъект регион город россия рф"},{"title":"Герб Ленинградской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9B%D0%B5%D0%BD%D0%B8%D0%BD%D0%B3%D1%80%D0%B0%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"ленинградская область Ленинградская область Область герб субъект регион город россия рф"},{"title":"Герб Липецкой области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9B%D0%B8%D0%BF%D0%B5%D1%86%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"липецкая область Липецкая область Область герб субъект регион город россия рф"},{"title":"Герб Магаданской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9C%D0%B0%D0%B3%D0%B0%D0%B4%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"магаданская область Магаданская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Марий Эл","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9C%D0%B0%D1%80%D0%B8%D0%B9%20%D0%AD%D0%BB","keys":"марий эл Марий Эл Республика герб субъект регион город россия рф"},{"title":"Герб Республики Мордовия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%9C%D0%BE%D1%80%D0%B4%D0%BE%D0%B2%D0%B8%D1%8F","keys":"мордовия Мордовия Республика герб субъект регион город россия рф"},{"title":"Герб Москвы","meta":"Субъекты и города РФ · Город федерального значения","url":"gerby-subektov-rf.html?q=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0","keys":"москва Москва Город федерального значения герб субъект регион город россия рф"},{"title":"Герб Московской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"московская область Московская область Область герб субъект регион город россия рф"},{"title":"Герб Мурманской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9C%D1%83%D1%80%D0%BC%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"мурманская область Мурманская область Область герб субъект регион город россия рф"},{"title":"Герб Ненецкого автономного округа","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%9D%D0%B5%D0%BD%D0%B5%D1%86%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3","keys":"ненецкий автономный округ Ненецкий автономный округ Автономный округ герб субъект регион город россия рф"},{"title":"Герб Нижегородской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9D%D0%B8%D0%B6%D0%B5%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"нижегородская область Нижегородская область Область герб субъект регион город россия рф"},{"title":"Герб Новгородской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9D%D0%BE%D0%B2%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"новгородская область Новгородская область Область герб субъект регион город россия рф"},{"title":"Герб Новосибирской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9D%D0%BE%D0%B2%D0%BE%D1%81%D0%B8%D0%B1%D0%B8%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"новосибирская область Новосибирская область Область герб субъект регион город россия рф"},{"title":"Герб Омской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9E%D0%BC%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"омская область Омская область Область герб субъект регион город россия рф"},{"title":"Герб Оренбургской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9E%D1%80%D0%B5%D0%BD%D0%B1%D1%83%D1%80%D0%B3%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"оренбургская область Оренбургская область Область герб субъект регион город россия рф"},{"title":"Герб Орловской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9E%D1%80%D0%BB%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"орловская область Орловская область Область герб субъект регион город россия рф"},{"title":"Герб Пензенской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9F%D0%B5%D0%BD%D0%B7%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"пензенская область Пензенская область Область герб субъект регион город россия рф"},{"title":"Герб Пермского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%9F%D0%B5%D1%80%D0%BC%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"пермский край Пермский край Край герб субъект регион город россия рф"},{"title":"Герб Приморского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%9F%D1%80%D0%B8%D0%BC%D0%BE%D1%80%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"приморский край Приморский край Край герб субъект регион город россия рф"},{"title":"Герб Псковской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%9F%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"псковская область Псковская область Область герб субъект регион город россия рф"},{"title":"Герб Ростовской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A0%D0%BE%D1%81%D1%82%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"ростовская область Ростовская область Область герб субъект регион город россия рф"},{"title":"Герб Рязанской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A0%D1%8F%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"рязанская область Рязанская область Область герб субъект регион город россия рф"},{"title":"Герб Самарской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B0%D0%BC%D0%B0%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"самарская область Самарская область Область герб субъект регион город россия рф"},{"title":"Герб Санкт-Петербурга","meta":"Субъекты и города РФ · Город федерального значения","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3","keys":"санкт-петербург Санкт-Петербург Город федерального значения герб субъект регион город россия рф"},{"title":"Герб Саратовской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B0%D1%80%D0%B0%D1%82%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"саратовская область Саратовская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Саха (Якутия)","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B0%D1%85%D0%B0%20(%D0%AF%D0%BA%D1%83%D1%82%D0%B8%D1%8F)","keys":"саха (якутия) Саха (Якутия) Республика герб субъект регион город россия рф"},{"title":"Герб Сахалинской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"сахалинская область Сахалинская область Область герб субъект регион город россия рф"},{"title":"Герб Свердловской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B2%D0%B5%D1%80%D0%B4%D0%BB%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"свердловская область Свердловская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Северная Осетия — Алания","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A1%D0%B5%D0%B2%D0%B5%D1%80%D0%BD%D0%B0%D1%8F%20%D0%9E%D1%81%D0%B5%D1%82%D0%B8%D1%8F%20%E2%80%94%20%D0%90%D0%BB%D0%B0%D0%BD%D0%B8%D1%8F","keys":"северная осетия — алания Северная Осетия — Алания Республика герб субъект регион город россия рф"},{"title":"Герб Смоленской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A1%D0%BC%D0%BE%D0%BB%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"смоленская область Смоленская область Область герб субъект регион город россия рф"},{"title":"Герб Ставропольского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%A1%D1%82%D0%B0%D0%B2%D1%80%D0%BE%D0%BF%D0%BE%D0%BB%D1%8C%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"ставропольский край Ставропольский край Край герб субъект регион город россия рф"},{"title":"Герб Тамбовской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A2%D0%B0%D0%BC%D0%B1%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"тамбовская область Тамбовская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Татарстан","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A2%D0%B0%D1%82%D0%B0%D1%80%D1%81%D1%82%D0%B0%D0%BD","keys":"татарстан Татарстан Республика герб субъект регион город россия рф"},{"title":"Герб Тверской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A2%D0%B2%D0%B5%D1%80%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"тверская область Тверская область Область герб субъект регион город россия рф"},{"title":"Герб Томской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A2%D0%BE%D0%BC%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"томская область Томская область Область герб субъект регион город россия рф"},{"title":"Герб Тульской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A2%D1%83%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"тульская область Тульская область Область герб субъект регион город россия рф"},{"title":"Герб Республики Тыва","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A2%D1%8B%D0%B2%D0%B0","keys":"тыва Тыва Республика герб субъект регион город россия рф"},{"title":"Герб Тюменской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A2%D1%8E%D0%BC%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"тюменская область Тюменская область Область герб субъект регион город россия рф"},{"title":"Герб Удмуртской Республики","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A3%D0%B4%D0%BC%D1%83%D1%80%D1%82%D1%81%D0%BA%D0%B0%D1%8F%20%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0","keys":"удмуртская республика Удмуртская Республика Республика герб субъект регион город россия рф"},{"title":"Герб Ульяновской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A3%D0%BB%D1%8C%D1%8F%D0%BD%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"ульяновская область Ульяновская область Область герб субъект регион город россия рф"},{"title":"Герб Усть-Ордынского Бурятского автономного округа","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%A3%D1%81%D1%82%D1%8C-%D0%9E%D1%80%D0%B4%D1%8B%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%91%D1%83%D1%80%D1%8F%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3","keys":"усть-ордынский бурятский автономный округ Усть-Ордынский Бурятский автономный округ Автономный округ герб субъект регион город россия рф"},{"title":"Герб Хабаровского края","meta":"Субъекты и города РФ · Край","url":"gerby-subektov-rf.html?q=%D0%A5%D0%B0%D0%B1%D0%B0%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D1%80%D0%B0%D0%B9","keys":"хабаровский край Хабаровский край Край герб субъект регион город россия рф"},{"title":"Герб Республики Хакасия","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A5%D0%B0%D0%BA%D0%B0%D1%81%D0%B8%D1%8F","keys":"хакасия Хакасия Республика герб субъект регион город россия рф"},{"title":"Герб Ханты-Мансийского автономного округа — Югры","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3%20%E2%80%94%20%D0%AE%D0%B3%D1%80%D0%B0","keys":"ханты-мансийский автономный округ — югра Ханты-Мансийский автономный округ — Югра Автономный округ герб субъект регион город россия рф"},{"title":"Герб Челябинской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"челябинская область Челябинская область Область герб субъект регион город россия рф"},{"title":"Герб Чеченской Республики","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A7%D0%B5%D1%87%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0","keys":"чеченская республика Чеченская Республика Республика герб субъект регион город россия рф"},{"title":"Герб Читинской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%A7%D0%B8%D1%82%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"читинская область Читинская область Область герб субъект регион город россия рф"},{"title":"Герб Чувашской Республики — Чувашии","meta":"Субъекты и города РФ · Республика","url":"gerby-subektov-rf.html?q=%D0%A7%D1%83%D0%B2%D0%B0%D1%88%D1%81%D0%BA%D0%B0%D1%8F%20%D0%A0%D0%B5%D1%81%D0%BF%D1%83%D0%B1%D0%BB%D0%B8%D0%BA%D0%B0%20%E2%80%94%20%D0%A7%D1%83%D0%B2%D0%B0%D1%88%D0%B8%D1%8F","keys":"чувашская республика — чувашия Чувашская Республика — Чувашия Республика герб субъект регион город россия рф"},{"title":"Герб Чукотского автономного округа","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%A7%D1%83%D0%BA%D0%BE%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3","keys":"чукотский автономный округ Чукотский автономный округ Автономный округ герб субъект регион город россия рф"},{"title":"Герб Ямало-Ненецкого автономного округа","meta":"Субъекты и города РФ · Автономный округ","url":"gerby-subektov-rf.html?q=%D0%AF%D0%BC%D0%B0%D0%BB%D0%BE-%D0%9D%D0%B5%D0%BD%D0%B5%D1%86%D0%BA%D0%B8%D0%B9%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BD%D0%BE%D0%BC%D0%BD%D1%8B%D0%B9%20%D0%BE%D0%BA%D1%80%D1%83%D0%B3","keys":"ямало-ненецкий автономный округ Ямало-Ненецкий автономный округ Автономный округ герб субъект регион город россия рф"},{"title":"Герб Ярославской области","meta":"Субъекты и города РФ · Область","url":"gerby-subektov-rf.html?q=%D0%AF%D1%80%D0%BE%D1%81%D0%BB%D0%B0%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C","keys":"ярославская область Ярославская область Область герб субъект регион город россия рф"},{"title":"Эмблема Верховного Суда","meta":"Ведомства РФ · Судебный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%92%D0%B5%D1%80%D1%85%D0%BE%D0%B2%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%A1%D1%83%D0%B4%D0%B0","keys":"верховный суд Эмблема Верховного Суда Судебный орган эмблема ведомство россия рф"},{"title":"Эмблема внутренних войск (Национальной гвардии)","meta":"Ведомства РФ · Силовое ведомство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%B2%D0%BD%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B8%D1%85%20%D0%B2%D0%BE%D0%B9%D1%81%D0%BA%20(%D0%9D%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%B3%D0%B2%D0%B0%D1%80%D0%B4%D0%B8%D0%B8)","keys":"внутренние войска (национальная гвардия) Эмблема внутренних войск (Национальной гвардии) Силовое ведомство эмблема ведомство россия рф росгвардия фсвнг"},{"title":"Эмблема Высшего Арбитражного Суда","meta":"Ведомства РФ · Судебный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%92%D1%8B%D1%81%D1%88%D0%B5%D0%B3%D0%BE%20%D0%90%D1%80%D0%B1%D0%B8%D1%82%D1%80%D0%B0%D0%B6%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%A1%D1%83%D0%B4%D0%B0","keys":"высший арбитражный суд Эмблема Высшего Арбитражного Суда Судебный орган эмблема ведомство россия рф"},{"title":"Эмблема Генеральной Прокуратуры","meta":"Ведомства РФ · Надзорный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%B5%D0%BD%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%9F%D1%80%D0%BE%D0%BA%D1%83%D1%80%D0%B0%D1%82%D1%83%D1%80%D1%8B","keys":"генеральная прокуратура Эмблема Генеральной Прокуратуры Надзорный орган эмблема ведомство россия рф генпрокуратура прокуратура"},{"title":"Эмблема Геральдического Совета при Президенте РФ","meta":"Ведомства РФ · При Президенте РФ","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%B4%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%20%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D0%B0%20%D0%BF%D1%80%D0%B8%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B5%20%D0%A0%D0%A4","keys":"геральдический совет при президенте рф Эмблема Геральдического Совета при Президенте РФ При Президенте РФ эмблема ведомство россия рф"},{"title":"Эмблема Главного управления специальных программ Президента РФ","meta":"Ведомства РФ · При Президенте РФ","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%BB%D0%B0%D0%B2%D0%BD%D0%BE%D0%B3%D0%BE%20%D1%83%D0%BF%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F%20%D1%81%D0%BF%D0%B5%D1%86%D0%B8%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85%20%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B0%D0%BC%D0%BC%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B0%20%D0%A0%D0%A4","keys":"главное управление специальных программ президента российской федерации Эмблема Главного управления специальных программ Президента РФ При Президенте РФ эмблема ведомство россия рф"},{"title":"Эмблема Государственной Думы РФ","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D0%94%D1%83%D0%BC%D1%8B%20%D0%A0%D0%A4","keys":"государственная дума Эмблема Государственной Думы РФ Федеральный орган эмблема ведомство россия рф госдума гд"},{"title":"Эмблема Государственной инспекции по маломерным судам","meta":"Ведомства РФ · Структура МЧС","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D0%B8%D0%BD%D1%81%D0%BF%D0%B5%D0%BA%D1%86%D0%B8%D0%B8%20%D0%BF%D0%BE%20%D0%BC%D0%B0%D0%BB%D0%BE%D0%BC%D0%B5%D1%80%D0%BD%D1%8B%D0%BC%20%D1%81%D1%83%D0%B4%D0%B0%D0%BC","keys":"государственная инспекция по маломерным судам Эмблема Государственной инспекции по маломерным судам Структура МЧС эмблема ведомство россия рф"},{"title":"Эмблема Государственной противопожарной службы","meta":"Ведомства РФ · Структура МЧС","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%93%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D0%BF%D1%80%D0%BE%D1%82%D0%B8%D0%B2%D0%BE%D0%BF%D0%BE%D0%B6%D0%B0%D1%80%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B","keys":"государственная противопожарная служба Эмблема Государственной противопожарной службы Структура МЧС эмблема ведомство россия рф"},{"title":"Эмблема Департамента государственной защиты имущества МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%B3%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B9%20%D0%B7%D0%B0%D1%89%D0%B8%D1%82%D1%8B%20%D0%B8%D0%BC%D1%83%D1%89%D0%B5%D1%81%D1%82%D0%B2%D0%B0%20%D0%9C%D0%92%D0%94","keys":"департамент государственной защиты имущества мвд Эмблема Департамента государственной защиты имущества МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента обеспечения безопасности дорожного движения МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%BE%D0%B1%D0%B5%D1%81%D0%BF%D0%B5%D1%87%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%B4%D0%BE%D1%80%D0%BE%D0%B6%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%B4%D0%B2%D0%B8%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%9C%D0%92%D0%94","keys":"департамент обеспечения безопасности дорожного движения мвд Эмблема Департамента обеспечения безопасности дорожного движения МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента обеспечения правопорядка на транспорте МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%BE%D0%B1%D0%B5%D1%81%D0%BF%D0%B5%D1%87%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D0%BF%D0%BE%D1%80%D1%8F%D0%B4%D0%BA%D0%B0%20%D0%BD%D0%B0%20%D1%82%D1%80%D0%B0%D0%BD%D1%81%D0%BF%D0%BE%D1%80%D1%82%D0%B5%20%D0%9C%D0%92%D0%94","keys":"департамент обеспечения правопорядка на транспорте мвд Эмблема Департамента обеспечения правопорядка на транспорте МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента охраны общественного порядка МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D1%8B%20%D0%BE%D0%B1%D1%89%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%BF%D0%BE%D1%80%D1%8F%D0%B4%D0%BA%D0%B0%20%D0%9C%D0%92%D0%94","keys":"департамент охраны общественного порядка мвд Эмблема Департамента охраны общественного порядка МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента по борьбе с организованной преступностью и терроризмом МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%BF%D0%BE%20%D0%B1%D0%BE%D1%80%D1%8C%D0%B1%D0%B5%20%D1%81%20%D0%BE%D1%80%D0%B3%D0%B0%D0%BD%D0%B8%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%BD%D0%BE%D0%B9%20%D0%BF%D1%80%D0%B5%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%BE%D1%81%D1%82%D1%8C%D1%8E%20%D0%B8%20%D1%82%D0%B5%D1%80%D1%80%D0%BE%D1%80%D0%B8%D0%B7%D0%BC%D0%BE%D0%BC%20%D0%9C%D0%92%D0%94","keys":"департамент по борьбе с организованной преступностью и терроризмом мвд Эмблема Департамента по борьбе с организованной преступностью и терроризмом МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента уголовного розыска МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D1%83%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%BE%D0%B3%D0%BE%20%D1%80%D0%BE%D0%B7%D1%8B%D1%81%D0%BA%D0%B0%20%D0%9C%D0%92%D0%94","keys":"департамент уголовного розыска мвд Эмблема Департамента уголовного розыска МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Департамента экономической безопасности МВД","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%94%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D1%8D%D0%BA%D0%BE%D0%BD%D0%BE%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B9%20%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%9C%D0%92%D0%94","keys":"департамент экономической безопасности мвд Эмблема Департамента экономической безопасности МВД Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Комиссии по военно-техническому сотрудничеству при Президенте РФ","meta":"Ведомства РФ · При Президенте РФ","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9A%D0%BE%D0%BC%D0%B8%D1%81%D1%81%D0%B8%D0%B8%20%D0%BF%D0%BE%20%D0%B2%D0%BE%D0%B5%D0%BD%D0%BD%D0%BE-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%BC%D1%83%20%D1%81%D0%BE%D1%82%D1%80%D1%83%D0%B4%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D1%82%D0%B2%D1%83%20%D0%BF%D1%80%D0%B8%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B5%20%D0%A0%D0%A4","keys":"комиссия по военно-техническому сотрудничеству с иностранными государствами при президенте рф Эмблема Комиссии по военно-техническому сотрудничеству при Президенте РФ При Президенте РФ эмблема ведомство россия рф"},{"title":"Эмблема Конституционного Суда","meta":"Ведомства РФ · Судебный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9A%D0%BE%D0%BD%D1%81%D1%82%D0%B8%D1%82%D1%83%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%A1%D1%83%D0%B4%D0%B0","keys":"конституционный суд Эмблема Конституционного Суда Судебный орган эмблема ведомство россия рф"},{"title":"Эмблема Министерства внутренних дел (МВД)","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%B2%D0%BD%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B8%D1%85%20%D0%B4%D0%B5%D0%BB%20(%D0%9C%D0%92%D0%94)","keys":"министерство внутренних дел (мвд) Эмблема Министерства внутренних дел (МВД) Министерство эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Министерства здравоохранения и социального развития","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%B7%D0%B4%D1%80%D0%B0%D0%B2%D0%BE%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D1%81%D0%BE%D1%86%D0%B8%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D1%80%D0%B0%D0%B7%D0%B2%D0%B8%D1%82%D0%B8%D1%8F","keys":"министерство здравоохранения и социального развития Эмблема Министерства здравоохранения и социального развития Министерство эмблема ведомство россия рф"},{"title":"Эмблема Министерства иностранных дел РФ","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%B8%D0%BD%D0%BE%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%BD%D1%8B%D1%85%20%D0%B4%D0%B5%D0%BB%20%D0%A0%D0%A4","keys":"министерство иностранных дел (мид) Эмблема Министерства иностранных дел РФ Министерство эмблема ведомство россия рф мид"},{"title":"Эмблема Министерства информационных технологий и связи","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D1%8B%D1%85%20%D1%82%D0%B5%D1%85%D0%BD%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B9%20%D0%B8%20%D1%81%D0%B2%D1%8F%D0%B7%D0%B8","keys":"министерство информационных технологий и связи Эмблема Министерства информационных технологий и связи Министерство эмблема ведомство россия рф"},{"title":"Эмблема Министерства культуры РФ","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%BA%D1%83%D0%BB%D1%8C%D1%82%D1%83%D1%80%D1%8B%20%D0%A0%D0%A4","keys":"министерство культуры российской федерации Эмблема Министерства культуры РФ Министерство эмблема ведомство россия рф"},{"title":"Эмблема Министерства науки и высшего образования РФ","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%BD%D0%B0%D1%83%D0%BA%D0%B8%20%D0%B8%20%D0%B2%D1%8B%D1%81%D1%88%D0%B5%D0%B3%D0%BE%20%D0%BE%D0%B1%D1%80%D0%B0%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D1%8F%20%D0%A0%D0%A4","keys":"министерство науки и высшего образования российской федерации Эмблема Министерства науки и высшего образования РФ Министерство эмблема ведомство россия рф"},{"title":"Эмблема Министерства обороны Российской Федерации","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D0%BE%D0%B1%D0%BE%D1%80%D0%BE%D0%BD%D1%8B%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B9%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B8","keys":"министерство обороны российской федерации Эмблема Министерства обороны Российской Федерации Министерство эмблема ведомство россия рф минобороны мо"},{"title":"Эмблема МЧС России","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%A7%D0%A1%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8","keys":"министерство по делам гражданской обороны, чрезвычайным ситуациям и ликвидации последствий стихийных бедствий (мчс) Эмблема МЧС России Министерство эмблема ведомство россия рф мчс минобороны мо"},{"title":"Эмблема Министерства финансов РФ","meta":"Ведомства РФ · Министерство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9C%D0%B8%D0%BD%D0%B8%D1%81%D1%82%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%B0%20%D1%84%D0%B8%D0%BD%D0%B0%D0%BD%D1%81%D0%BE%D0%B2%20%D0%A0%D0%A4","keys":"министерство финансов российской федерации Эмблема Министерства финансов РФ Министерство эмблема ведомство россия рф минфин"},{"title":"Эмблема Национального центрального бюро Интерпола при МВД России","meta":"Ведомства РФ · Структура МВД","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9D%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D1%86%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%B1%D1%8E%D1%80%D0%BE%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%BF%D0%BE%D0%BB%D0%B0%20%D0%BF%D1%80%D0%B8%20%D0%9C%D0%92%D0%94%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8","keys":"национальное центральное бюро интерпола при мвд россии Эмблема Национального центрального бюро Интерпола при МВД России Структура МВД эмблема ведомство россия рф мвд полиция"},{"title":"Эмблема Президента Российской Федерации","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B0%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B9%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B8","keys":"президент российской федерации Эмблема Президента Российской Федерации Федеральный орган эмблема ведомство россия рф"},{"title":"Эмблема Службы безопасности Президента РФ","meta":"Ведомства РФ · При Президенте РФ","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B0%20%D0%A0%D0%A4","keys":"служба безопасности президента рф Эмблема Службы безопасности Президента РФ При Президенте РФ эмблема ведомство россия рф"},{"title":"Эмблема Службы внешней разведки РФ","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20%D0%B2%D0%BD%D0%B5%D1%88%D0%BD%D0%B5%D0%B9%20%D1%80%D0%B0%D0%B7%D0%B2%D0%B5%D0%B4%D0%BA%D0%B8%20%D0%A0%D0%A4","keys":"служба внешней разведки рф Эмблема Службы внешней разведки РФ Федеральная служба эмблема ведомство россия рф свр"},{"title":"Эмблема Совета Безопасности","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D0%B0%20%D0%91%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8","keys":"совет безопасности Эмблема Совета Безопасности Федеральный орган эмблема ведомство россия рф"},{"title":"Эмблема Совета Федерации","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B8","keys":"совет федерации Эмблема Совета Федерации Федеральный орган эмблема ведомство россия рф совфед сф"},{"title":"Эмблема Судебного департамента при Верховном Суде РФ","meta":"Ведомства РФ · Судебный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D1%83%D0%B4%D0%B5%D0%B1%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%B4%D0%B5%D0%BF%D0%B0%D1%80%D1%82%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%D0%B0%20%D0%BF%D1%80%D0%B8%20%D0%92%D0%B5%D1%80%D1%85%D0%BE%D0%B2%D0%BD%D0%BE%D0%BC%20%D0%A1%D1%83%D0%B4%D0%B5%20%D0%A0%D0%A4","keys":"судебный департамент при верховном суде российской федерации Эмблема Судебного департамента при Верховном Суде РФ Судебный орган эмблема ведомство россия рф"},{"title":"Эмблема Счетной Палаты РФ","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A1%D1%87%D0%B5%D1%82%D0%BD%D0%BE%D0%B9%20%D0%9F%D0%B0%D0%BB%D0%B0%D1%82%D1%8B%20%D0%A0%D0%A4","keys":"счетная палата Эмблема Счетной Палаты РФ Федеральный орган эмблема ведомство россия рф"},{"title":"Эмблема Управления делами Президента Российской Федерации","meta":"Ведомства РФ · При Президенте РФ","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A3%D0%BF%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B4%D0%B5%D0%BB%D0%B0%D0%BC%D0%B8%20%D0%9F%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82%D0%B0%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B9%D1%81%D0%BA%D0%BE%D0%B9%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B8","keys":"управление делами президента российской федерации Эмблема Управления делами Президента Российской Федерации При Президенте РФ эмблема ведомство россия рф"},{"title":"Эмблема Федеральной антимонопольной службы","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%B0%D0%BD%D1%82%D0%B8%D0%BC%D0%BE%D0%BD%D0%BE%D0%BF%D0%BE%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B","keys":"федеральная антимонопольная служба Эмблема Федеральной антимонопольной службы Федеральная служба эмблема ведомство россия рф фас"},{"title":"Эмблема Федеральной миграционной службы (ФМС)","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%BC%D0%B8%D0%B3%D1%80%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20(%D0%A4%D0%9C%D0%A1)","keys":"федеральная миграционная служба Эмблема Федеральной миграционной службы (ФМС) Федеральная служба эмблема ведомство россия рф фмс"},{"title":"Эмблема Федеральной службы безопасности России","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20%D0%B1%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D0%B8%20%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8","keys":"федеральная служба безопасности россии Эмблема Федеральной службы безопасности России Федеральная служба эмблема ведомство россия рф фсб"},{"title":"Эмблема Федеральной службы войск национальной гвардии РФ","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20%D0%B2%D0%BE%D0%B9%D1%81%D0%BA%20%D0%BD%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%B3%D0%B2%D0%B0%D1%80%D0%B4%D0%B8%D0%B8%20%D0%A0%D0%A4","keys":"федеральная служба войск национальной гвардии российской федерации Эмблема Федеральной службы войск национальной гвардии РФ Федеральная служба эмблема ведомство россия рф росгвардия фсвнг"},{"title":"Эмблема Роспотребнадзора","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A0%D0%BE%D1%81%D0%BF%D0%BE%D1%82%D1%80%D0%B5%D0%B1%D0%BD%D0%B0%D0%B4%D0%B7%D0%BE%D1%80%D0%B0","keys":"федеральная служба по надзору в сфере защиты прав потребителей и благополучия человека Эмблема Роспотребнадзора Федеральная служба эмблема ведомство россия рф роспотребнадзор"},{"title":"Эмблема Росприроднадзора","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A0%D0%BE%D1%81%D0%BF%D1%80%D0%B8%D1%80%D0%BE%D0%B4%D0%BD%D0%B0%D0%B4%D0%B7%D0%BE%D1%80%D0%B0","keys":"федеральная служба по надзору в сфере природопользования Эмблема Росприроднадзора Федеральная служба эмблема ведомство россия рф"},{"title":"Эмблема Федеральной службы судебных приставов","meta":"Ведомства РФ · Федеральная служба","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D1%81%D0%BB%D1%83%D0%B6%D0%B1%D1%8B%20%D1%81%D1%83%D0%B4%D0%B5%D0%B1%D0%BD%D1%8B%D1%85%20%D0%BF%D1%80%D0%B8%D1%81%D1%82%D0%B0%D0%B2%D0%BE%D0%B2","keys":"федеральная служба судебных приставов Эмблема Федеральной службы судебных приставов Федеральная служба эмблема ведомство россия рф фссп"},{"title":"Эмблема Федерального медико-биологического агентства","meta":"Ведомства РФ · Федеральное агентство","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A4%D0%B5%D0%B4%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%BC%D0%B5%D0%B4%D0%B8%D0%BA%D0%BE-%D0%B1%D0%B8%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%20%D0%B0%D0%B3%D0%B5%D0%BD%D1%82%D1%81%D1%82%D0%B2%D0%B0","keys":"федеральное медико-биологическое агентство Эмблема Федерального медико-биологического агентства Федеральное агентство эмблема ведомство россия рф фмба"},{"title":"Эмблема Центральной Избирательной Комиссии","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A6%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%98%D0%B7%D0%B1%D0%B8%D1%80%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE%D0%B9%20%D0%9A%D0%BE%D0%BC%D0%B8%D1%81%D1%81%D0%B8%D0%B8","keys":"центральная избирательная комиссия Эмблема Центральной Избирательной Комиссии Федеральный орган эмблема ведомство россия рф цик"},{"title":"Эмблема Центрального Банка","meta":"Ведомства РФ · Федеральный орган","url":"emblemy-vedomstv-rf.html?q=%D0%AD%D0%BC%D0%B1%D0%BB%D0%B5%D0%BC%D0%B0%20%D0%A6%D0%B5%D0%BD%D1%82%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%91%D0%B0%D0%BD%D0%BA%D0%B0","keys":"центральный банк Эмблема Центрального Банка Федеральный орган эмблема ведомство россия рф цб центробанк банк россии"}];

  const normalize = value => String(value || '')
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g,'е')
    .replace(/[^a-zа-я0-9]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();

  const stopWords = new Set(['и','в','во','на','по','для','к','ко','с','со','из','от','до','при']);

  const stemRu = raw => {
    let word = normalize(raw);
    if (!word || word.length <= 3 || /[a-z]/.test(word)) return word;
    const suffixes = [
      'иями','ями','ами','остью','остями','ического','ическая','ические','ический',
      'ого','его','ому','ему','ыми','ими','иях','ях','ах','иям','ям','ам',
      'ую','юю','ая','яя','ое','ее','ые','ие','ый','ий','ой','ых','их',
      'иями','ией','ией','ию','ью','ия','ья','ии','ие','ье',
      'ов','ев','ей','ем','ом','ам','ям','ах','ях','ой','ей',
      'а','я','ы','и','ь','й','у','ю','е','о'
    ];
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
        word = word.slice(0, -suffix.length);
        break;
      }
    }
    return word;
  };

  const tokens = value => normalize(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !stopWords.has(word))
    .map(stemRu)
    .filter(Boolean);

  const tokenMatches = (queryToken, targetToken) => {
    if (queryToken === targetToken) return true;
    // Autocomplete should react from two typed letters: "мо" -> "москва".
    if (queryToken.length >= 2 && targetToken.startsWith(queryToken)) return true;
    if (queryToken.length < 3 || targetToken.length < 3) return false;
    return queryToken.startsWith(targetToken);
  };

  const indexedPages = pages.map(page => {
    const titleNorm = normalize(page.title);
    const hayNorm = normalize(page.title + ' ' + page.meta + ' ' + page.keys);
    return {
      ...page,
      titleNorm,
      hayNorm,
      titleTokens: tokens(page.title),
      hayTokens: tokens(page.title + ' ' + page.meta + ' ' + page.keys)
    };
  });

  const rankPages = query => {
    const qNorm = normalize(query);
    const qTokens = tokens(query);
    if (!qNorm || !qTokens.length) return [];

    return indexedPages.map(page => {
      let score = 0;

      if (page.titleNorm === qNorm) score += 220;
      if (page.titleNorm.startsWith(qNorm)) score += 95;
      if (page.titleNorm.includes(qNorm)) score += 75;
      if (page.hayNorm.includes(qNorm)) score += 45;

      let allMatched = true;
      qTokens.forEach(qt => {
        const exactTitle = page.titleTokens.includes(qt);
        const titleMatch = page.titleTokens.some(tt => tokenMatches(qt,tt));
        const exactHay = page.hayTokens.includes(qt);
        const hayMatch = page.hayTokens.some(ht => tokenMatches(qt,ht));

        if (exactTitle) score += 30;
        else if (titleMatch) score += 22;
        else if (exactHay) score += 16;
        else if (hayMatch) score += 10;
        else allMatched = false;
      });

      if (!allMatched) score = 0;
      return {page, score};
    })
    .filter(item => item.score > 0)
    .sort((a,b) => b.score - a.score || a.page.title.localeCompare(b.page.title,'ru'))
    .slice(0,10)
    .map(item => item.page);
  };

  const escapeHtml = value => String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');

  const render = query => {
    const matches = rankPages(query);
    if (!normalize(query)) {
      results.hidden = true;
      results.innerHTML = '';
      return matches;
    }

    if (!matches.length) {
      results.innerHTML = '<div class="home-search-empty">Ничего не нашли. Попробуйте название региона, сокращение ведомства или исполнение: «РФ», «МВД», «Московской области», «металлизация».</div>';
      results.hidden = false;
      return matches;
    }

    const rawQuery=String(query||'').trim();
    const allMatchesLink=matches.length>1
      ? '<a class="home-search-result home-search-result-all" href="catalog.html?q=' + encodeURIComponent(rawQuery) + '">' +
          '<span><strong>Все варианты по запросу «' + escapeHtml(rawQuery) + '»</strong><small>Показать все подходящие товары в каталоге</small></span>' +
          '<span class="home-search-all-arrow" aria-hidden="true">→</span>' +
        '</a>'
      : '';

    results.innerHTML =
      allMatchesLink +
      matches.map(page =>
        '<a class="home-search-result" href="' + escapeHtml(page.url) + '">' +
          '<span><strong>' + escapeHtml(page.title) + '</strong><small>' + escapeHtml(page.meta) + '</small></span>' +
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
    const query = String(input.value || '').trim();
    if (!query) {
      window.location.href = 'catalog.html';
      return;
    }
    window.location.href = 'catalog.html?q=' + encodeURIComponent(query);
  });

  hintButtons.forEach(button => {
    button.addEventListener('click', () => {
      const query = button.dataset.searchQuery || '';
      input.value = query;
      window.location.href = 'catalog.html?q=' + encodeURIComponent(query);
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


// Search aggregate result styling
if(!document.getElementById('site-search-all-variants-style')){
  const style=document.createElement('style');
  style.id='site-search-all-variants-style';
  style.textContent=
    '.home-search-result-all{margin:0 0 5px;border:1px solid rgba(166,124,50,.34)!important;border-radius:8px;background:#fffaf0!important;padding:14px!important}'+
    '.home-search-result-all:hover,.home-search-result-all:focus{background:#f7edd8!important;border-color:#b58a3f!important}'+
    '.home-search-result-all strong{font-family:"Manrope",Arial,sans-serif!important;font-size:13px!important;font-weight:700!important;color:#0d2742!important}'+
    '.home-search-result-all small{margin-top:4px!important;font-size:10px!important;color:#7d745f!important}'+
    '.home-search-result-all .home-search-all-arrow{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#0d2742;color:#e7c97f!important;font-size:16px!important}'+
    '@media(max-width:720px){.home-search-result-all{padding:12px!important}.home-search-result-all strong{font-size:12px!important}.home-search-result-all .home-search-all-arrow{width:28px;height:28px}}';
  document.head.appendChild(style);
}

// Product detail context navigation
(() => {
  const section=document.querySelector('.product-final');
  const oldBreadcrumb=section?.querySelector('.catalog-breadcrumb');
  if(!section || !oldBreadcrumb || section.querySelector('.product-context-shell')) return;

  const anchors=[...oldBreadcrumb.querySelectorAll('a')];
  const rawParts=oldBreadcrumb.textContent
    .split('/')
    .map(part=>part.trim())
    .filter(Boolean);

  const current=rawParts[rawParts.length-1] || document.title.split('|')[0].trim();
  const crumbs=[];

  crumbs.push('<a href="catalog.html#popular">Весь каталог</a>');

  anchors.forEach(link=>{
    const label=(link.textContent||'').trim();
    if(!label || label==='Главная') return;
    const href=link.getAttribute('href')||'#';
    crumbs.push('<span class="product-crumb-sep">›</span>');
    crumbs.push('<a href="'+href.replace(/"/g,'&quot;')+'">'+label.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</a>');
  });

  crumbs.push('<span class="product-crumb-sep">›</span>');
  crumbs.push('<span class="product-crumb-current">'+current.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>');

  const shell=document.createElement('div');
  shell.className='product-context-shell';
  shell.innerHTML=
    '<div class="container product-context-inner">'+
      '<a class="product-back-link" href="catalog.html#popular" data-product-back>Вернуться в каталог</a>'+
      '<nav class="product-context-crumbs" aria-label="Навигация по товару">'+crumbs.join('')+'</nav>'+
    '</div>';

  section.insertBefore(shell,section.firstChild);

  const back=shell.querySelector('[data-product-back]');
  back?.addEventListener('click',event=>{
    const ref=document.referrer||'';
    if(ref.includes('/catalog.html')){
      event.preventDefault();
      history.back();
    }
  });
})();

// Automatic product-image whitespace trimming
(() => {
  function cornerBackground(data,w,h){
    const sample=Math.max(3,Math.round(Math.min(w,h)*0.035));
    const points=[];
    const starts=[[0,0],[w-sample,0],[0,h-sample],[w-sample,h-sample]];
    starts.forEach(([sx,sy])=>{
      for(let y=sy;y<Math.min(h,sy+sample);y+=2){
        for(let x=sx;x<Math.min(w,sx+sample);x+=2){
          const i=(y*w+x)*4;
          points.push([data[i],data[i+1],data[i+2],data[i+3]]);
        }
      }
    });
    if(!points.length) return [250,249,245,255];
    const s=points.reduce((a,p)=>[a[0]+p[0],a[1]+p[1],a[2]+p[2],a[3]+p[3]],[0,0,0,0]);
    return s.map(v=>v/points.length);
  }

  function subjectBox(img){
    const nw=img.naturalWidth, nh=img.naturalHeight;
    if(!nw||!nh) return null;

    const scanMax=420;
    const ratio=Math.min(1,scanMax/Math.max(nw,nh));
    const w=Math.max(1,Math.round(nw*ratio));
    const h=Math.max(1,Math.round(nh*ratio));

    const scan=document.createElement('canvas');
    scan.width=w;scan.height=h;
    const ctx=scan.getContext('2d',{willReadFrequently:true});
    if(!ctx) return null;
    ctx.drawImage(img,0,0,w,h);

    const data=ctx.getImageData(0,0,w,h).data;
    const bg=cornerBackground(data,w,h);
    const transparent=bg[3]<45;

    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
        if(a<12) continue;

        let fg=false;
        if(transparent){
          fg=a>24;
        }else{
          const dr=r-bg[0],dg=g-bg[1],db=b-bg[2];
          const distance=Math.sqrt(dr*dr+dg*dg+db*db);
          fg=distance>30 || Math.abs(a-bg[3])>30;
        }
        if(!fg) continue;

        if(x<minX)minX=x;if(x>maxX)maxX=x;
        if(y<minY)minY=y;if(y>maxY)maxY=y;
      }
    }

    if(maxX<minX||maxY<minY) return null;

    const bw=maxX-minX+1,bh=maxY-minY+1;
    const padX=Math.max(3,bw*.025);
    const padY=Math.max(3,bh*.025);

    minX=Math.max(0,minX-padX);
    minY=Math.max(0,minY-padY);
    maxX=Math.min(w-1,maxX+padX);
    maxY=Math.min(h-1,maxY+padY);

    const inv=1/ratio;
    return {
      x:minX*inv,
      y:minY*inv,
      w:(maxX-minX+1)*inv,
      h:(maxY-minY+1)*inv
    };
  }

  function trimImage(img){
    if(img.dataset.catalogTrimmed==='true') return;
    if(!img.naturalWidth||!img.naturalHeight) return;

    let box;
    try{box=subjectBox(img)}catch(e){return}
    if(!box) return;

    const maxOut=1400;
    const outScale=Math.min(1,maxOut/Math.max(box.w,box.h));
    const ow=Math.max(1,Math.round(box.w*outScale));
    const oh=Math.max(1,Math.round(box.h*outScale));

    const out=document.createElement('canvas');
    out.width=ow;out.height=oh;
    const ctx=out.getContext('2d');
    if(!ctx) return;

    ctx.drawImage(
      img,
      box.x,box.y,box.w,box.h,
      0,0,ow,oh
    );

    img.dataset.catalogTrimmed='true';
    img.dataset.originalSrc=img.currentSrc||img.src;
    img.src=out.toDataURL('image/png');
  }

  function init(){
    document.querySelectorAll('.popular-media img').forEach(img=>{
      if(img.complete&&img.naturalWidth) trimImage(img);
      else img.addEventListener('load',()=>trimImage(img),{once:true});
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

// Mobile popular-card size scroller
(() => {
  function setupScroller(switcher){
    if(switcher.dataset.mobileScrollerReady==='true') return;
    switcher.dataset.mobileScrollerReady='true';

    const host=switcher.closest('.popular-spec-size');
    const dd=switcher.closest('dd');
    if(!host||!dd) return;

    const hint=document.createElement('span');
    hint.className='popular-size-scroll-label';
    hint.textContent='Листайте →';
    host.appendChild(hint);

    const fade=document.createElement('span');
    fade.className='popular-size-scroll-fade';
    fade.setAttribute('aria-hidden','true');
    dd.appendChild(fade);

    const update=()=>{
      const overflow=switcher.scrollWidth-switcher.clientWidth>6;
      const atEnd=!overflow || switcher.scrollLeft+switcher.clientWidth>=switcher.scrollWidth-6;
      host.classList.toggle('size-scrollable',overflow);
      host.classList.toggle('size-scroll-end',atEnd);
      hint.hidden=!overflow||atEnd;
      fade.hidden=!overflow||atEnd;
    };

    switcher.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update,{passive:true});
    requestAnimationFrame(update);
    setTimeout(update,250);
  }

  function init(){
    document.querySelectorAll('.popular-size-switcher').forEach(setupScroller);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

// Unified popular-card size pricing
(() => {
  if(window.__derzhavaPopularPricingInit) return;
  window.__derzhavaPopularPricingInit=true;

  const money=new Intl.NumberFormat('ru-RU');

  function bindCard(card){
    if(card.dataset.priceBindingReady==='true') return;
    const buttons=[...card.querySelectorAll('[data-card-size]')];
    const price=card.querySelector('.popular-card-price');
    if(!buttons.length||!price) return;

    card.dataset.priceBindingReady='true';

    buttons.forEach(button=>{
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();

        buttons.forEach(item=>{
          const active=item===button;
          item.classList.toggle('active',active);
          item.setAttribute('aria-pressed',active?'true':'false');
        });

        const value=Number(button.dataset.price||0);
        if(!Number.isFinite(value)||value<=0) return;

        price.classList.add('price-changing');
        price.textContent=money.format(value)+' ₽';
        requestAnimationFrame(()=>{
          requestAnimationFrame(()=>price.classList.remove('price-changing'));
        });
      });
    });
  }

  function init(){
    document.querySelectorAll('.popular-card').forEach(bindCard);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  document.addEventListener('derzhava:catalog-render',init);
})();


/* Unified commercial CTA routing v1 */
(() => {
  const offerTextPattern=/(получить\s+предложен|отправить\s+запрос|оставить\s+(?:заявк|запрос)|уточнить\s+(?:исполнен|стоимост|заказ)|запросить\s+(?:предложен|стоимост|расч[её]т)|индивидуальн(?:ый|ого)\s+заказ)/i;

  const isOfferCta=anchor=>{
    if(!anchor || anchor.tagName!=='A') return false;
    const text=(anchor.textContent||'').replace(/\s+/g,' ').trim();
    return offerTextPattern.test(text);
  };

  const normalizeOfferLinks=()=>{
    document.querySelectorAll('a').forEach(anchor=>{
      if(isOfferCta(anchor)) anchor.setAttribute('href','offer.html');
    });
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',normalizeOfferLinks);
  }else{
    normalizeOfferLinks();
  }

  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a');
    if(!isOfferCta(anchor)) return;
    event.preventDefault();
    window.location.href='offer.html';
  },true);
})();
