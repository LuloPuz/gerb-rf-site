// Shared product-card rendering. Preview never binds purchasing or navigation.
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const categories={rf:'Гербы РФ',region:'Гербы субъектов РФ',city:'Гербы городов РФ',department:'Эмблемы ведомств'};
export function renderProductCard(p,{target,makePhoto,preview=false,bindPurchase,backHref='products.html',zoomRoot=document.body}){
 const layout=node('div',undefined,'final-product-grid ds-product-grid'),gallery=node('div',undefined,'final-product-gallery'),main=node('button',undefined,'final-product-main ds-image-main'),thumbs=node('div',undefined,'final-product-thumbs ds-thumbs');
 main.type='button';main.setAttribute('aria-label','Увеличить изображение');
 let selectedPhoto=p.photos[0]?.id;
 const show=id=>{selectedPhoto=id;main.replaceChildren(makePhoto(id,p.title),node('span','Увеличить','image-zoom-hint'));};
 if(selectedPhoto)show(selectedPhoto);else{main.disabled=true;main.append(node('span','Добавьте фотографию','ds-status'));}
 main.addEventListener('click',()=>{
  if(!selectedPhoto)return;
  const dialog=node('dialog',undefined,'ds-zoom'),close=node('button','×','ds-zoom-close');close.type='button';close.setAttribute('aria-label','Закрыть');close.onclick=()=>dialog.close();
  dialog.append(close,makePhoto(selectedPhoto,p.title));zoomRoot.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
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
 const price=node('div',money(sizes[0].price),'final-price'),priceGroup=node('div',undefined,'ds-promo-product-price'),old=node('s',undefined,'ds-old-price'),badge=node('span',undefined,'ds-discount-badge'),options=node('div',undefined,'size-options');
 function showPrice(v){price.textContent=money(v.price);const sale=Number.isSafeInteger(v.oldPrice)&&v.oldPrice>v.price;old.hidden=badge.hidden=!sale;if(sale){old.textContent=money(v.oldPrice);const pct=Math.floor((v.oldPrice-v.price)*100/v.oldPrice);badge.textContent=pct>0?'−'+pct+'%':'Акция';}priceGroup.classList.toggle('ds-has-promo',sale);}
 const oldRow=node('div',undefined,'ds-promo-old-row');oldRow.append(old,badge);priceGroup.append(price,oldRow);showPrice(sizes[0]);
 options.setAttribute('role','group');options.setAttribute('aria-label','Выберите размер');
 info.append(priceGroup,node('p','Выберите размер','size-label'),options);
 for(const [i,v] of sizes.entries()){
  const b=node('button',v.size,'size-option');b.type='button';b.setAttribute('aria-pressed',String(i===0));b.classList.toggle('active',i===0);
  b.addEventListener('click',()=>{selectedVariant=v;showPrice(v);for(const t of options.children){t.setAttribute('aria-pressed',String(t===b));t.classList.toggle('active',t===b);}});options.append(b);
 }
 const custom=node('a',undefined,'custom-size-inline'),copy=node('span',undefined,'custom-size-inline-copy');
 if(preview)custom.setAttribute('aria-disabled','true');else custom.href='offer.html';copy.append(node('strong','Не нашли нужного размера?'),node('small','Возможно изготовление герба под индивидуальный запрос'));custom.append(copy,node('span','Уточнить размер'));info.append(custom);
 if(p.material)info.append(node('p','Материал: '+p.material,'ds-detail'));
 {const time=node('div',undefined,'production-time');time.append(node('strong','Срок изготовления'),node('span',String(p.leadTime||'').trim()||'Уточняется при оформлении заказа.'));info.append(time);}
 const actions=node('div',undefined,'shop-product-actions'),buy=node('button','Добавить в корзину','shop-add-button'),cart=node('a','Корзина','shop-go-cart');buy.type='button';buy.disabled=true;buy.title=preview?'Покупка отключена в предпросмотре':'Приём заказов пока закрыт';if(preview)cart.setAttribute('aria-disabled','true');else{cart.href='cart.html';bindPurchase?.(buy,p.sku,()=>selectedVariant,'Добавить в корзину');}actions.append(buy,cart);info.append(actions);
 const back=node('a','← Продолжить покупки','button final-order-button shop-direct-order');if(preview)back.setAttribute('aria-disabled','true');else back.href=backHref;info.append(back);
 layout.append(gallery,info);target.replaceChildren(layout);
 for(const [heading,value] of [['Описание товара',p.description],['Характеристики',p.specs]]){
  if(!value)continue;
  const section=node('section',undefined,'ds-text');section.append(node('h2',heading),node('p',value));target.append(section);
 }
}
