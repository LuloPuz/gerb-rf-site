import {productKeys} from './dynamic-search.js?v=20261128-search1';
import {fetchProducts,renderCard} from './storefront-cards.js?v=20261128-home1';
const $=s=>document.querySelector(s);
const content=$('[data-ds-content]'),status=$('[data-ds-status]'),kind=document.body.dataset.dynamicPage;
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const categories={rf:'Гербы РФ',region:'Гербы субъектов РФ',city:'Гербы городов РФ',department:'Эмблемы ведомств'};
const skuOK=s=>typeof s==='string'&&/^[0-9]{4}$/.test(s);
const uuidOK=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
const priceOK=n=>Number.isSafeInteger(n)&&n>=1&&n<=100000000;
const photoUrl=id=>'/api/catalog/photo?id='+encodeURIComponent(id);
const productUrl=sku=>'product.html?sku='+encodeURIComponent(sku);
const layoutCheck=new URLSearchParams(location.search).get('layout')==='check';
function image(id,alt,cls){
 const im=node('img',undefined,cls);im.src=photoUrl(id);im.alt=alt;im.decoding='async';return im;
}
function showStatus(message){content.replaceChildren();content.hidden=true;status.hidden=false;status.textContent=message;}
function showContent(){status.hidden=true;content.hidden=false;}
async function get(path){
 const r=await fetch(path,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok){const e=Error('HTTP '+r.status);e.status=r.status;throw e;}
 return r.json();
}
function bindCart(button,sku,selected,label){
 if(layoutCheck||typeof window.derzhavaDynamicCartAdd!=='function')return;
 button.disabled=false;button.removeAttribute('title');
 button.addEventListener('click',async()=>{
  if(button.disabled)return;
  const v=selected();button.disabled=true;
  try{if(await window.derzhavaDynamicCartAdd({sku,size:v.size,price:v.price})){
   button.textContent='Добавлено ✓';
   setTimeout(()=>{button.textContent=label;},1500);
  }}finally{button.disabled=false;}
 });
}
function renderProduct(p){
 document.title=p.title+' | Держава';$('[data-ds-crumb]').textContent=p.title;
 const layout=node('div',undefined,'final-product-grid ds-product-grid'),gallery=node('div',undefined,'final-product-gallery'),main=node('button',undefined,'final-product-main ds-image-main'),thumbs=node('div',undefined,'final-product-thumbs ds-thumbs');
 main.type='button';main.setAttribute('aria-label','Увеличить изображение');
 let selectedPhoto=p.photos[0].id;
 const makePhoto=(id,alt)=>layoutCheck?legacyImage(id,alt):image(id,alt);
 const show=id=>{selectedPhoto=id;main.replaceChildren(makePhoto(id,p.title),node('span','Увеличить','image-zoom-hint'));};
 show(selectedPhoto);
 main.addEventListener('click',()=>{
  const dialog=node('dialog',undefined,'ds-zoom'),close=node('button','×','ds-zoom-close');close.type='button';close.setAttribute('aria-label','Закрыть');close.onclick=()=>dialog.close();
  dialog.append(close,makePhoto(selectedPhoto,p.title));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 });
 gallery.append(main);
 if(p.photos.length>1){
  for(const [i,ph] of p.photos.entries()){
   const b=node('button',undefined,'gallery-thumb');b.type='button';b.setAttribute('aria-label','Фото '+(i+1));b.append(makePhoto(ph.id,''));b.addEventListener('click',()=>{show(ph.id);for(const t of thumbs.children){t.setAttribute('aria-pressed',String(t===b));t.classList.toggle('active',t===b);}});b.setAttribute('aria-pressed',String(i===0));b.classList.toggle('active',i===0);thumbs.append(b);
  }
  gallery.append(thumbs);
 }
 const info=node('div',undefined,'final-product-info');
 info.append(node('p',p.eyebrow||categories[p.category],'eyebrow'),node('h1',p.productTitle||p.title),node('p',p.productFinish||p.finish,'final-finish'),node('p','Артикул: '+p.sku,'product-article'));
 const sizes=[...p.variants];let selectedVariant=sizes[0];
 const price=node('div',money(sizes[0].price),'final-price'),options=node('div',undefined,'size-options');
 options.setAttribute('role','group');options.setAttribute('aria-label','Выберите размер');
 info.append(price,node('p','Выберите размер','size-label'),options);
 for(const [i,v] of sizes.entries()){
  const b=node('button',v.size,'size-option');b.type='button';b.setAttribute('aria-pressed',String(i===0));b.classList.toggle('active',i===0);
  b.addEventListener('click',()=>{selectedVariant=v;price.textContent=money(v.price);for(const t of options.children){t.setAttribute('aria-pressed',String(t===b));t.classList.toggle('active',t===b);}});options.append(b);
 }
 const custom=node('a',undefined,'custom-size-inline'),copy=node('span',undefined,'custom-size-inline-copy');
 custom.href='offer.html';copy.append(node('strong','Не нашли нужного размера?'),node('small','Возможно изготовление герба под индивидуальный запрос'));custom.append(copy,node('span','Уточнить размер'));info.append(custom);
 if(p.material)info.append(node('p','Материал: '+p.material,'ds-detail'));
 if(p.leadTime){const time=node('div',undefined,'production-time');time.append(node('strong','Срок изготовления'),node('span',p.leadTime));info.append(time);}
 const actions=node('div',undefined,'shop-product-actions'),buy=node('button','Добавить в корзину','shop-add-button'),cart=node('a','Корзина','shop-go-cart');buy.type='button';buy.disabled=true;buy.title='Приём заказов пока закрыт';cart.href='cart.html';bindCart(buy,p.sku,()=>selectedVariant,'Добавить в корзину');actions.append(buy,cart);info.append(actions);
 const back=node('a','← Продолжить покупки','button final-order-button shop-direct-order');back.href='products.html'+(layoutCheck?'?layout=check':'');info.append(back);
 layout.append(gallery,info);content.replaceChildren(layout);
 for(const [heading,value] of [['Описание товара',p.description],['Характеристики',p.specs]]){
  if(!value)continue;
  const section=node('section',undefined,'ds-text');section.append(node('h2',heading),node('p',value));content.append(section);
 }
 showContent();
}
function validProduct(p,sku){
 return p?.sku===sku&&['title','finish','description','specs','material','leadTime'].every(k=>typeof p[k]==='string')&&Object.hasOwn(categories,p.category)&&Array.isArray(p.variants)&&p.variants.length>0&&p.variants.every(v=>typeof v.size==='string'&&priceOK(v.price))&&Array.isArray(p.photos)&&p.photos.length>0&&p.photos.length<=8&&p.photos.every(ph=>uuidOK(ph.id));
}
async function loadProduct(){
 const params=new URLSearchParams(location.search),sku=params.get('sku');
 if(params.getAll('sku').length!==1||!skuOK(sku)){showStatus('Товар не найден. Вернитесь в каталог.');return;}
 try{const p=await get('/api/catalog/product?sku='+encodeURIComponent(sku));if(!validProduct(p,sku))throw Error();renderProduct(p);}
 catch(e){showStatus(e.status===404?'Карточка пока недоступна. Вернитесь в каталог.':'Не удалось загрузить карточку. Обновите страницу.');}
}
function renderList(products,preview=false){
 const search=$('[data-ds-search]'),category=$('[data-ds-category]');
 search.value=new URLSearchParams(location.search).get('q')||'';
 const render=()=>{
  content.replaceChildren();const q=search.value.trim().toLowerCase(),cat=category.value;
  const filtered=products.filter(p=>(!cat||p.category===cat)&&(!q||(typeof window.derzhavaProductMatches==='function'?window.derzhavaProductMatches(q,productKeys(p)):productKeys(p).toLowerCase().includes(q))));
  if(!filtered.length){content.append(node   content.append(renderCard(p,preview));t,node('span','арт. '+p.sku,'popular-card-sku'),media,body);content.append(card);
  }
 };
 search.oninput=render;category.onchange=render;$('[data-ds-filters]').hidden=false;render();showContent();
}
async function loadList(){
 try{
  const snapshot=await fetchProducts();
  if(!snapshot.published){showStatus('Динамический каталог пока не опубликован.');return;}
  renderList(snapshot.products);
 }catch{showStatus('Не удалось загрузить каталог. Обновите страницу.');}
}
// Layout verification only: read existing public static pages. No draft API,
// no publication switch, no cart write, no upload or modification of images.
function legacyUrl(value,html=false){
 const u=new URL(value,location.origin+'/');
 if(u.origin!==location.origin||u.username||u.password||u.hash||
    (html?!/^\/gerb-[a-z0-9-]+\.html$/.test(u.pathname):!/\.(png|jpe?g|webp)$/i.test(u.pathname)))throw Error('Invalid legacy path');
 return u.pathname+u.search;
}
function legacyImage(src,alt){const im=node('img');im.alt=alt;im.src=legacyUrl(src);im.decoding='async';return im;}
function staticPrice(s){
 const n=Number(String(s).replace(/[^\d]/g,''));if(!priceOK(n))throw Error('Invalid sample price');return n;
}
async function staticPage(path){
 const r=await fetch(path,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error();return new DOMParser().parseFromString(await r.text(),'text/html');
}
function previewNotice(path){
 const note=node('p',undefined,'ds-layout-note');
 note.append('Проверка оформления. Используются существующие публичные фотографии и старые тестовые цены, не актуальное предложение. ');
 const a=node('a','Сравнить со старой версией');a.href=path;note.append(a);status.before(note);
}
async function loadLayoutCheck(){
 try{
  const doc=await staticPage('/catalog.html');
  const data=[...doc.querySelectorAll('article.popular-card[data-product-card]')].map(card=>{
   const sku=card.querySelector('.popular-card-sku').textContent.replace(/\D/g,'');
   if(!skuOK(sku))throw Error();
   return {sku,title:card.querySelector('h3').textContent.trim(),finish:[...card.querySelectorAll('.popular-chip')].map(x=>x.textContent.trim()).join(' · '),
    category:card.dataset.group==='moscow'?'city':'rf',priceFrom:Math.min(...[...card.querySelectorAll('[data-card-size]')].map(b=>staticPrice(b.dataset.price))),
    fields:[...card.querySelectorAll('.popular-specs > div:not(.popular-spec-size)')].map(row=>[row.querySelector('dt').textContent.trim(),row.querySelector('dd').textContent.trim()]),
    image:legacyUrl(card.querySelector('.popular-media img').getAttribute('src')),path:legacyUrl(card.querySelector('.popular-hit').getAttribute('href'),true),
    variants:[...card.querySelectorAll('[data-card-size]')].map(b=>({size:[b.querySelector('span')?.textContent,b.querySelector('small')?.textContent].filter(Boolean).join(' ').trim(),price:staticPrice(b.dataset.price)}))};
  });
  if(data.length!==18||new Set(data.map(p=>p.sku)).size!==18)throw Error();
  if(kind==='list'){previewNotice('/catalog.html#popular');renderList(data,true);return;}
  const sku=new URLSearchParams(location.search).get('sku'),p=data.find(x=>x.sku===sku);
  if(!p){showStatus('Товар для сравнения не найден.');return;}
  const page=await staticPage(p.path);
  const main=page.querySelector('[data-gallery-main]')?.getAttribute('src')||p.image;
  const thumbs=[...page.querySelectorAll('.gallery-thumb[data-src]')].map(x=>x.dataset.src);
  p.photos=[...new Set([main,...thumbs].map(x=>legacyUrl(x)))].map(id=>({id}));
  p.description=[...page.querySelectorAll('.about-copy p')].map(x=>x.textContent.trim()).join('\n\n');
  p.specs='';p.material='';p.leadTime=page.querySelector('.production-time span')?.textContent.trim()||'';
  p.productTitle=page.querySelector('.final-product-info h1')?.textContent.trim();p.productFinish=page.querySelector('.final-finish')?.textContent.trim();p.eyebrow=page.querySelector('.final-product-info .eyebrow')?.textContent.trim();
  previewNotice(p.path);renderProduct(p);
 }catch{showStatus('Не удалось загрузить образцы оформления. Обновите страницу.');}
}
if(location.origin!=='https://gerbrf.ru')showStatus('Динамический каталог доступен на gerbrf.ru.');
else if(layoutCheck)loadLayoutCheck();
else if(kind==='product')loadProduct();else loadList();
