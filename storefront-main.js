import {fetchProducts,renderCard} from './storefront-cards.js?v=20261128-snapshot1';
const section=document.querySelector('#popular'),grid=section?.querySelector('.popular-grid');
if(grid&&location.origin==='https://gerbrf.ru'){
 let live=false,busy=false;
 const count=section.querySelector('.home-popular-summary > span,.catalog-section-count');
 const summary=document.querySelector('.catalog-meta-full span:last-child');
 const originals=[...grid.children];
 const originalCount=count?.textContent,originalSummary=summary?.textContent;
 const notice=document.createElement('p');notice.setAttribute('role','status');notice.hidden=true;grid.before(notice);
 function update(products){
  const fragment=document.createDocumentFragment();
  for(const p of products)fragment.append(renderCard(p));
  grid.replaceChildren(fragment);live=true;notice.hidden=true;
  if(count)count.textContent=products.length+' товаров с фото';
  if(summary)summary.textContent=products.length+' товаров с фото';
  document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));
 }
 async function refresh(){
  if(busy)return;busy=true;
  try{
   const data=await fetchProducts();
   if(!data.published){
    if(live){grid.replaceChildren(...originals);live=false;if(count)count.textContent=originalCount;if(summary)summary.textContent=originalSummary;document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));}
    notice.hidden=true;return;
   }
   update(data.products);
   if(!data.products.length){notice.textContent='Пока нет опубликованных товаров. Обратитесь к менеджеру для индивидуального заказа.';notice.hidden=false;}
  }catch{
   // After cutover never retain stale public dynamic items on an API failure.
   // During staging the old static catalog remains visible.
   if(live){grid.replaceChildren();notice.textContent='Не удалось обновить ассортимент. Попробуйте обновить страницу.';notice.hidden=false;document.dispatchEvent(new CustomEvent('derzhava:storefront-render'));}
  }finally{busy=false;}
 }
 refresh();
 window.addEventListener('pageshow',e=>{if(e.persisted)refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
