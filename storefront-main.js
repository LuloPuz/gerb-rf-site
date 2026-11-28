import {fetchProducts,renderCard} from './storefront-cards.js?v=20261128-private1';
import {adminPreview,previewProducts,addPreviewNotice} from './storefront-private-preview.js?v=20261128-private2';
const section=document.querySelector('#popular'),grid=section?.querySelector('.popular-grid');
if(grid&&location.origin==='https://gerbrf.ru'){
 const dynamic=window.derzhavaStorefrontMode==='dynamic',home=!!section.querySelector('.home-popular-summary');
 let live=false,busy=false;
 const count=section.querySelector('.home-popular-summary > span,.catalog-section-count');
 const summary=document.querySelector('.catalog-meta-full span:last-child');
 const notice=document.createElement('p');notice.setAttribute('role','status');notice.hidden=true;grid.before(notice);
 function clear(message){grid.replaceChildren();live=false;if(count)count.textContent='0 товаров с фото';if(summary)summary.textContent='0 товаров с фото';notice.textContent=message;notice.hidden=false;document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));}
 function update(products){
  const fragment=document.createDocumentFragment();
  for(const p of products)fragment.append(renderCard(p,adminPreview?'admin':false));
  grid.replaceChildren(fragment);live=true;notice.hidden=true;
  if(count)count.textContent=products.length+' товаров с фото';
  if(summary)summary.textContent=products.length+' товаров с фото';
  document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));
 }
 async function refresh(){
  if(busy||(!dynamic&&!adminPreview))return;busy=true;
  try{
   const data=await (adminPreview?previewProducts():fetchProducts());
   if(!data.published){
    clear('Каталог пока закрыт. Можно обратиться за индивидуальным предложением.');return;
   }
   const products=home?data.products.filter(p=>p.featured===true):data.products;
   update(products);
   if(!products.length){notice.textContent=data.products.length&&home?'В разделе пока нет выбранных товаров. Перейдите в полный каталог.':'Пока нет опубликованных товаров. Обратитесь к менеджеру для индивидуального заказа.';notice.hidden=false;}
  }catch{
   // After cutover never retain stale public dynamic items on an API failure.
   // During staging the old static catalog remains visible.
   clear(adminPreview?'Предпросмотр недоступен. Войдите в админку и откройте ссылку снова.':'Не удалось обновить ассортимент. Попробуйте обновить страницу.');
  }finally{busy=false;}
 }
 if(adminPreview)addPreviewNotice(grid);
 if(dynamic||adminPreview){grid.replaceChildren();notice.textContent='Загружаем каталог…';notice.hidden=false;document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));}
 refresh();
 window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
