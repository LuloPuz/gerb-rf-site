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
function renderProduct(p){
 document.title=p.title+' | Держава';$('[data-ds-crumb]').textContent=p.title;
 const layout=node('div',undefined,'final-product-grid ds-product-grid'),gallery=node('div',undefined,'final-product-gallery'),main=node('div',undefined,'ds-image-main'),thumbs=node('div',undefined,'ds-thumbs');
 const show=(id)=>{main.replaceChildren(layoutCheck?legacyImage(id,p.title):image(id,p.title));};
 show(p.photos[0].id);
 for(const [i,ph] of p.photos.entries()){
  const b=node('button');b.type='button';b.setAttribute('aria-label','Фото '+(i+1));b.append(layoutCheck?legacyImage(ph.id,''):image(ph.id,''));b.addEventListener('click',()=>{show(ph.id);for(const t of thumbs.children)t.setAttribute('aria-pressed',String(t===b));});b.setAttribute('aria-pressed',String(i===0));thumbs.append(b);
 }
 gallery.append(main,thumbs);
 const info=node('div',undefined,'final-product-info');
 info.append(node('p',categories[p.category],'eyebrow'),node('h1',p.title),node('p',p.finish,'final-finish'),node('p','Артикул: '+p.sku,'product-article'));
 const sizes=[...p.variants].sort((a,b)=>a.size.localeCompare(b.size,'ru',{numeric:true}));
 const price=node('div',money(sizes[0].price),'final-price'),options=node('div',undefined,'ds-sizes');
 info.append(price,node('p','Выберите размер','size-label'),options);
 for(const [i,v] of sizes.entries()){
  const b=node('button',v.size);b.type='button';b.setAttribute('aria-pressed',String(i===0));
  b.addEventListener('click',()=>{price.textContent=money(v.price);for(const t of options.children)t.setAttribute('aria-pressed',String(t===b));});options.append(b);
 }
 if(p.material)info.append(node('p','Материал: '+p.material,'ds-detail'));
 if(p.leadTime)info.append(node('p','Срок изготовления: '+p.leadTime,'ds-detail'));
 const buy=node('button','Приём заказов пока закрыт','button button-gold ds-disabled');buy.type='button';buy.disabled=true;info.append(buy);
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
 const render=()=>{
  content.replaceChildren();const q=search.value.trim().toLowerCase(),cat=category.value;
  const list=products.filter(p=>(!cat||p.category===cat)&&(!q||[p.sku,p.title,p.finish,categories[p.category]].join(' ').toLowerCase().includes(q)));
  if(!list.length){content.append(node('p','Нет подходящих товаров.','ds-empty'));return;}
  for(const p of list){
   const card=node('a',undefined,'ds-card');card.href=productUrl(p.sku)+(preview?'&layout=check':'');
   const media=node('div',undefined,'ds-card-media'),im=preview?legacyImage(p.image,p.title):image(p.imageId,p.title);im.loading='lazy';media.append(im);
   const text=node('div',undefined,'ds-card-copy');text.append(node('p','арт. '+p.sku,'ds-sku'),node('h2',p.title),node('p',p.finish,'ds-finish'),node('strong','от '+money(p.priceFrom),'ds-card-price'));
   card.append(media,text);content.append(card);
  }
 };
 search.oninput=render;category.onchange=render;$('[data-ds-filters]').hidden=false;render();showContent();
}
async function loadList(){
 try{
  const data=await get('/api/catalog/products');
  if(typeof data.published!=='boolean'||!Array.isArray(data.products)||!data.products.every(p=>skuOK(p.sku)&&typeof p.title==='string'&&typeof p.finish==='string'&&Object.hasOwn(categories,p.category)&&priceOK(p.priceFrom)&&uuidOK(p.imageId)))throw Error();
  if(!data.published){showStatus('Динамический каталог пока не опубликован.');return;}
  renderList(data.products);
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
  p.specs='';p.material='';p.leadTime='';
  previewNotice(p.path);renderProduct(p);
 }catch{showStatus('Не удалось загрузить образцы оформления. Обновите страницу.');}
}
if(location.origin!=='https://gerbrf.ru')showStatus('Динамический каталог доступен на gerbrf.ru.');
else if(layoutCheck)loadLayoutCheck();
else if(kind==='product')loadProduct();else loadList();
