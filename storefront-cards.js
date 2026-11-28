import {productKeys,publicSearchPages} from './dynamic-search.js?v=20261128-search1';
import {parseCatalog} from './catalog-pricing.js?v=20261128-sizeorder1';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const productUrl=sku=>'product.html?sku='+encodeURIComponent(sku);
const layoutCheck=new URLSearchParams(location.search).get('layout')==='check';
function image(id,alt){const im=node('img');im.src='/api/catalog/photo?id='+encodeURIComponent(id);im.alt=alt;im.decoding='async';return im;}
function legacyImage(src,alt){const u=new URL(src,location.origin);if(u.origin!==location.origin||!/\.(png|jpe?g|webp)$/i.test(u.pathname))throw Error('Invalid image');const im=node('img');im.src=u.pathname+u.search;im.alt=alt;im.decoding='async';return im;}
export function finishFields(finish){
 const parts=String(finish||'').split(' · ').filter(Boolean);
 const coating=parts.find(x=>/краск|металлизац/i.test(x)),relief=parts.find(x=>/^(?:барельеф|горельеф)$/i.test(x)),shield=parts.find(x=>/щит/i.test(x));
 const material=shield?.match(/щит\s+(пластик|бархат|металл)$/i)?.[1];
 if(!coating&&!relief&&!shield)return [['Исполнение',finish||'—']];
 const rows=[];
 if(coating)rows.push(['Покрытие',coating]);
 if(relief)rows.push(['Рельеф',relief]);
 if(shield)rows.push(['Исполнение',shield==='Без щита'?'Без щита':material?'На щите':shield]);
 if(material)rows.push(['Материал щита',material[0].toUpperCase()+material.slice(1)]);
 else if(shield==='Без щита')rows.push(['Материал щита','—']);
 return rows;
}
export function projectProducts(data,variants){
 const list=publicSearchPages(data),snapshot=parseCatalog(variants);
 if(list.published!==snapshot.published)throw Error('Catalog policy mismatch');
 if(!list.published)return {published:false,products:[]};
 const products=data.products.map(p=>{
  if(Object.hasOwn(p,'position')&&(!Number.isInteger(p.position)||p.position<1||p.position>999999)||Object.hasOwn(p,'featured')&&typeof p.featured!=='boolean')throw Error('Invalid placement');
  const rows=snapshot.bySku.get(p.sku)||[];
  if(!rows.length||rows.some(v=>v.dynamicImageId!==p.imageId||v.title!==p.title||v.finish!==p.finish)||Math.min(...rows.map(v=>v.price))!==p.priceFrom)throw Error('Catalog projection mismatch');
  return {...p,position:p.position??Number(p.sku)*10,featured:p.featured??(/^10(?:0[1-9]|1[0-8])$/.test(p.sku)),variants:[...rows].sort((a,b)=>(a.sizePosition??99999)-(b.sizePosition??99999)||a.size.localeCompare(b.size,'ru',{numeric:true}))};
 });
 if(snapshot.bySku.size!==products.length)throw Error('Unexpected variants');
 return {published:true,products:products.sort((a,b)=>a.position-b.position||a.sku.localeCompare(b.sku))};
}
async function get(path){const r=await fetch(path,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok){const e=Error('HTTP '+r.status);e.status=r.status;throw e;}return r.json();}
export async function fetchProducts(){
 // During deployment an old API may reject the new query. In that case
 // retain the previous read-only staging path, never fallback after errors.
 let snapshot;
 try{snapshot=await get('/api/catalog/products?snapshot=1');}
 catch(e){if(e.status!==400)throw e;const [data,variants]=await Promise.all([get('/api/catalog/products'),get('/api/catalog/variants')]);return projectProducts(data,variants);}
 return projectProducts(snapshot.catalog,snapshot.pricing);
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

export function renderCard(p,preview=false){
const href=productUrl(p.sku)+(preview?'&layout=check':'');
   const card=node('article',undefined,'popular-card');card.dataset.productCard='';card.dataset.popularCard='';card.dataset.dynamicCard='';card.dataset.category=p.category;card.dataset.group=p.category==='rf'?'rf':p.category==='city'&&/москв/i.test(p.title)?'moscow':p.category;card.dataset.search=productKeys(p);
   const hit=node('a',undefined,'popular-hit');hit.href=href;hit.setAttribute('aria-label','Открыть '+p.title);
   const media=node('div',undefined,'popular-media'),im=preview?legacyImage(p.image,p.title):image(p.imageId,p.title);im.loading='lazy';media.append(im);
   const body=node('div',undefined,'popular-body popular-body-pro'),title=node('div',undefined,'popular-title-block');
   title.append(node('p','Настенное исполнение','popular-overline'),node('h3',p.title));
   const chips=node('div',undefined,'popular-chips');
   for(const [i,chip] of p.finish.split(' · ').filter(Boolean).entries())chips.append(node('span',chip,'popular-chip'+(i===0?' popular-chip-accent':'')));
   const specs=node('dl',undefined,'popular-specs');
   const fields=p.fields||finishFields(p.finish);
   for(const [k,v] of fields){const row=node('div');row.append(node('dt',k),node('dd',v));specs.append(row);}
   const sizeRow=node('div',undefined,'popular-spec-size'),dd=node('dd'),sizes=node('div',undefined,'popular-size-switcher');sizes.setAttribute('role','group');sizes.setAttribute('aria-label','Выберите размер');
   const price=node('strong',money(p.variants[0].price),'popular-card-price'),old=node('s',undefined,'ds-old-price'),badge=node('span',undefined,'ds-discount-badge'),oldRow=node('div',undefined,'ds-promo-old-row');oldRow.append(old,badge);let selectedVariant=p.variants[0];
   function showPrice(v){price.textContent=money(v.price);const sale=Number.isSafeInteger(v.oldPrice)&&v.oldPrice>v.price;old.hidden=badge.hidden=oldRow.hidden=!sale;if(sale){old.textContent=money(v.oldPrice);const pct=Math.floor((v.oldPrice-v.price)*100/v.oldPrice);badge.textContent=pct>0?'−'+pct+'%':'Акция';}card.classList.toggle('ds-has-promo',sale);}showPrice(selectedVariant);
   for(const [i,v] of p.variants.entries()){
    const b=node('button',undefined,'popular-size-choice'+(i===0?' active':''));b.type='button';b.setAttribute('aria-pressed',String(i===0));
    b.append(node('span',v.size.replace(/\s*см$/u,'')),node('small','см'));
    b.addEventListener('click',()=>{
     selectedVariant=v;showPrice(v);
     for(const t of sizes.children){t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));}
     // Scroll only this horizontal size strip, never the page.
     if(sizes.scrollWidth>sizes.clientWidth+2){
      const item=b.getBoundingClientRect(),strip=sizes.getBoundingClientRect();
      const target=sizes.scrollLeft+item.left-strip.left-sizes.clientLeft-(sizes.clientWidth-item.width)/2;
      sizes.scrollTo({left:Math.max(0,Math.min(target,sizes.scrollWidth-sizes.clientWidth)),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
     }
    });sizes.append(b);
   }
   const custom=node('a','Нужен другой размер?','custom-size-link');custom.href='offer.html';const scroll=node('div',undefined,'ds-size-scroll');
   if(p.variants.length>1){
    const prev=node('button','‹','ds-size-arrow'),next=node('button','›','ds-size-arrow');
    prev.type=next.type='button';prev.setAttribute('aria-label','Предыдущие размеры');next.setAttribute('aria-label','Следующие размеры');
    prev.disabled=true;
    const sync=()=>{prev.disabled=sizes.scrollLeft<=2;next.disabled=sizes.scrollLeft+sizes.clientWidth>=sizes.scrollWidth-2;};
    const move=dir=>{const step=(sizes.firstElementChild?.getBoundingClientRect().width||90)+5;sizes.scrollBy({left:dir*step,behavior:'smooth'});};
    prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));sizes.addEventListener('scroll',sync,{passive:true});
    scroll.append(prev,sizes,next);requestAnimationFrame(sync);
   }else{scroll.classList.add('ds-size-single');scroll.append(sizes);}
   dd.append(scroll,custom);sizeRow.append(node('dt',p.variants.length>1?'Размер · '+p.variants.length+' вариантов':'Размер'),dd);specs.append(sizeRow);
   const bottom=node('div',undefined,'popular-card-bottom'),priceBlock=node('div',undefined,'popular-price-block'),actions=node('div',undefined,'popular-card-actions');
   priceBlock.append(node('span','Цена выбранного размера','popular-price-caption'),price,oldRow);
   const buy=node('button',undefined,'popular-add-cart');buy.type='button';buy.disabled=true;buy.title='Приём заказов пока закрыт';buy.append(node('span','В корзину'));if(!preview)bindCart(buy,p.sku,()=>selectedVariant,'В корзину');
   actions.append(buy);actions.style.gridTemplateColumns='minmax(0,1fr)';bottom.append(priceBlock,actions);
   card.addEventListener('click',e=>{if(!e.defaultPrevented&&e.button===0&&!e.target.closest('a,button,input,select,textarea,label,.ds-size-scroll')&&!window.getSelection()?.toString()){if(e.metaKey||e.ctrlKey)window.open(href,'_blank','noopener');else location.assign(href);}});body.append(title,chips,specs,bottom);card.append(hit,node('span','арт. '+p.sku,'popular-card-sku'),media,body);return card;
}
