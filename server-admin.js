(() => {
'use strict';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const gate=$('[data-gate]'),dashboard=$('[data-dashboard]'),message=$('[data-message]');
let generation=0,tab='overview',busy=false,orders=[],variants=[],orderCursor=null,catalogCursor=null,reference='';
let marker=null,mutationBusy=false;
const catalogDrafts=new Map(),expandedProducts=new Set();
const transitions={'Новая заявка':['Подтверждён','Отменён'],'Подтверждён':['Ожидает оплаты','В производстве','Отменён'],'Ожидает оплаты':['В производстве','Отменён'],'В производстве':['Отправлен','Отменён'],'Отправлен':['Получен']};
const originOK=location.origin==='https://gerbrf.ru';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const date=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):'—';};
function clear(){
 generation++;busy=false;marker=null;reference='';catalogDrafts.clear();expandedProducts.clear();orders=[];variants=[];orderCursor=null;catalogCursor=null;
 dashboard.hidden=true;gate.hidden=false;$('[data-logout]').hidden=true;
 for(const s of ['[data-stats]','[data-intake]','[data-orders]','[data-catalog]','[data-code]'])$(s).replaceChildren();
 for(const s of ['[data-enroll]','[data-code]','[data-copy]','[data-login]','[data-retry]','[data-orders-more]','[data-catalog-more]'])$(s).hidden=true;
 $('[data-enroll-status]').textContent='';message.textContent='';
}
function deny(text,login=false,enroll=false){
 clear();$('[data-gate-status]').textContent=text;$('[data-login]').hidden=!login;
 $('[data-retry]').hidden=false;$('[data-enroll]').hidden=!enroll;
}
async function get(path){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 if(!r.ok){const err=Error('HTTP '+r.status);err.status=r.status;throw err;}
 return r.json();
}
function failure(err,current){
 if(current!==generation)return;
 if(err.status===401||err.status===403)deny('Доступ к панели закрыт. Войдите заново в аккаунт администратора.',true,err.status===403);
 else message.textContent='Не удалось загрузить данные. Нажмите «Обновить».';
}
async function boot(){
 clear();const current=generation;
 if(!originOK){deny('Панель доступна только на gerbrf.ru.');return;}
 $('[data-gate-status]').textContent='Проверяем права доступа…';
 try{
 const r=await get('/api/admin/session');if(current!==generation)return;
 if(r.authorized!==true||typeof r.sessionMarker!=='string'||!/^[a-f0-9]{64}$/.test(r.sessionMarker))throw Error();
 marker=r.sessionMarker;
 gate.hidden=true;dashboard.hidden=false;$('[data-logout]').hidden=false;
 await select(tab);
 }catch(err){if(current!==generation)return;deny(err.status===401?'Войдите в личный кабинет.':err.status===403?'У аккаунта нет действующих административных полномочий.':'Не удалось проверить доступ. Повторите попытку.',err.status===401||err.status===403,err.status===403);}
}
async function select(key){
 tab=key;const current=++generation;busy=false;
 all('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===key)));
 all('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==key);
 $('[data-title]').textContent={overview:'Обзор',orders:'Заказы',catalog:'Товары'}[key];
 // Drop private data from inactive panels.
 orders=[];variants=[];orderCursor=null;catalogCursor=null;
 $('[data-orders]').replaceChildren();$('[data-catalog]').replaceChildren();
 $('[data-orders-more]').hidden=true;$('[data-catalog-more]').hidden=true;
 message.textContent='Загружаем…';
 if(key==='overview'){
  try{
   const v=await get('/api/admin/overview');if(current!==generation)return;
   const metrics=[['Товары',v.products],['Варианты',v.variants],['Доступные варианты',v.activeVariants],['Все заказы',v.orders],['Новые заявки',v.newOrders]];
   if(!metrics.every(x=>Number.isSafeInteger(x[1])&&x[1]>=0)||typeof v.intakeEnabled!=='boolean')throw Error();
   $('[data-stats]').replaceChildren(...metrics.map(([label,n])=>{const el=node('article',undefined,'sa-stat');el.append(node('span',label),node('strong',n));return el;}));
   $('[data-intake]').textContent=v.intakeEnabled?'Приём заказов включён':'Приём заказов закрыт';
   message.textContent='';
  }catch(err){failure(err,current);}
 }else await load(false);
}
async function changeStatus(o,next,button,selectControl){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='orders'||!transitions[o.status]?.includes(next))return;
 if(!window.confirm('Изменить статус заказа ДРЖ-'+o.number+' на «'+next+'»?'))return;
 const current=generation,session=marker;mutationBusy=true;button.disabled=true;selectControl.disabled=true;
 try{
  const r=await fetch('/api/admin/orders/status',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({number:o.number,expected:o.status,next}),signal:AbortSignal.timeout(12000)});
  if(current!==generation)return;
  if(r.status===401||r.status===403){deny('Доступ к панели закрыт. Войдите заново.',true);return;}
  if(r.status===409){await select('orders');message.textContent='Заказ или сессия изменились. Проверьте актуальные данные.';return;}
  if(!r.ok)throw Error();
  const data=await r.json();
  if(data.number!==o.number||data.status!==next)throw Error();
  await select('orders');message.textContent='Статус заказа обновлён.';
 }catch{if(current===generation)message.textContent='Не удалось подтвердить изменение. Обновите список перед повтором.';}
 finally{mutationBusy=false;button.disabled=false;selectControl.disabled=false;}
}
function renderOrders(){
 const q=$('[data-order-search]').value.trim().toLowerCase(),status=$('[data-order-filter]').value;
 const list=orders.filter(o=>(!status||o.status===status)&&(!q||[o.number,o.customer?.name,o.customer?.phone,o.customer?.organization].join(' ').toLowerCase().includes(q)));
 const target=$('[data-orders]');target.replaceChildren();
 if(!list.length){target.append(node('p',orders.length?'Среди загруженных заказов ничего не найдено.':'Заказов пока нет.','sa-empty'));return;}
 for(const o of list){
  const card=node('article',undefined,'sa-order'),head=node('div',undefined,'sa-order-head'),title=node('div');
  title.append(node('h2','ДРЖ-'+o.number),node('p',date(o.createdAt),'sa-note'));
  head.append(title,node('span',o.status,'sa-pill'),node('strong',money(o.total)));card.append(head);
  const details=node('details');details.append(node('summary','Подробнее о заказе'));
  const contact=node('div',undefined,'sa-details');
  for(const [label,value] of [['Имя',o.customer?.name],['Телефон',o.customer?.phone],['Email',o.customer?.email],['Организация',o.customer?.organization],['ИНН',o.customer?.inn],['Доставка',o.delivery],['Адрес',o.customer?.address],['Комментарий',o.comment]]){const el=node('p');el.append(node('strong',label+': '),document.createTextNode(value||'—'));contact.append(el);}
  details.append(contact,node('h3','Состав заказа'));
  for(const i of o.items||[]){const item=node('div',undefined,'sa-item');item.append(node('strong',i.title),node('p',[i.sku,i.size,i.finish].filter(Boolean).join(' · '),'sa-note'),node('p',i.quantity+' шт. × '+money(i.price)));details.append(item);}
  if(o.history?.length){details.append(node('h3','История статусов'));for(const h of o.history)details.append(node('p',date(h.at)+' · '+h.status,'sa-note'));}
  card.append(details);
  const available=transitions[o.status]||[];
  if(available.length){
   const action=node('div',undefined,'sa-status-action'),selectControl=node('select');
   selectControl.setAttribute('aria-label','Новый статус заказа '+o.number);
   const placeholder=node('option','Выберите статус');placeholder.value='';placeholder.disabled=true;placeholder.selected=true;selectControl.append(placeholder);
   for(const value of available){const option=node('option',value);option.value=value;selectControl.append(option);}
   const button=node('button','Изменить статус','sa-status-save');button.type='button';button.disabled=true;
   selectControl.addEventListener('change',()=>button.disabled=!selectControl.value);
   button.addEventListener('click',()=>changeStatus(o,selectControl.value,button,selectControl));
   action.append(selectControl,button);card.append(action);
  }
  target.append(card);
 }
}
async function editVariant(v,price,active,button){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 if(!Number.isSafeInteger(price)||price<1||price>100000000){message.textContent='Введите целую цену от 1 до 100 000 000 ₽.';return;}
 if(price===v.price&&active===v.active)return;
 if(!window.confirm('Сохранить изменения артикула '+v.sku+' · '+v.size+'? Цена: '+money(price)+'. '+(active?'Вариант подготовлен к продаже.':'Вариант неактивен.')))return;
 const current=generation,session=marker;mutationBusy=true;button.disabled=true;
 try{
  const r=await fetch('/api/admin/catalog/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({id:v.id,expectedPrice:v.price,expectedActive:v.active,price,active}),signal:AbortSignal.timeout(12000)});
  if(current!==generation)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(r.status===409){await boot();message.textContent='Изменение отклонено: данные или сессия изменились либо приём заказов открыт.';return;}
  if(!r.ok)throw Error();
  const data=await r.json();
  if(data.id!==v.id||data.price!==price||data.active!==active)throw Error();
  Object.assign(v,data);catalogDrafts.delete(v.id);renderCatalog();message.textContent='Вариант сохранён в серверном каталоге.';
 }catch{if(current===generation)message.textContent='Не удалось подтвердить сохранение. Обновите данные.';}
 finally{mutationBusy=false;button.disabled=false;}
}
function renderCatalog(){
 const q=$('[data-catalog-search]').value.trim().toLowerCase();
 const list=variants.filter(v=>[v.sku,v.title,v.finish,v.size].join(' ').toLowerCase().includes(q));
 const groups=new Map();
 for(const v of list){if(!groups.has(v.sku))groups.set(v.sku,[]);groups.get(v.sku).push(v);}
 const target=$('[data-catalog]');target.replaceChildren();
 const summary=$('[data-catalog-summary]');
 summary.textContent='Артикулов: '+groups.size+' · Вариантов: '+list.length+(catalogCursor?' · Показана часть каталога':'');
 for(const [sku,rows] of [...groups].sort((a,b)=>a[0].localeCompare(b[0],'ru',{numeric:true}))){
  rows.sort((a,b)=>parseFloat(a.size.replace(',','.'))-parseFloat(b.size.replace(',','.'))||a.size.localeCompare(b.size,'ru',{numeric:true}));
  const v=rows[0],card=node('details',undefined,'sa-catalog-card');
  card.open=expandedProducts.has(sku)||!!q;
  card.addEventListener('toggle',()=>{if(!q){if(card.open)expandedProducts.add(sku);else expandedProducts.delete(sku);}});
  const head=node('summary',undefined,'sa-catalog-head'),photo=node('div',undefined,'sa-catalog-photo');
  photo.append(node('span','Нет фото','sa-note'));
  try{
   const u=new URL(v.image,location.href);
   if(v.image&&u.origin===location.origin&&/\.(png|jpe?g|webp)$/i.test(u.pathname)){
    const im=node('img');im.src=u.pathname+u.search;im.alt='';im.loading='lazy';im.addEventListener('load',()=>photo.replaceChildren(im),{once:true});im.addEventListener('error',()=>im.remove(),{once:true});photo.append(im);
   }
  }catch{}
  const title=node('div',undefined,'sa-catalog-title');title.append(node('strong',v.title),node('p',v.finish,'sa-note'),node('p','Арт. '+sku,'sa-sku'));
  const meta=node('div',undefined,'sa-catalog-meta');meta.append(node('strong','от '+money(Math.min(...rows.map(x=>x.price)))),node('p',rows.length+' вар. · '+rows.filter(x=>x.active).length+' актив.','sa-note'));
  head.append(photo,title,meta);card.append(head);
  const tableWrap=node('div',undefined,'sa-variant-wrap'),table=node('table'),thead=node('thead'),headers=node('tr');
  for(const h of ['Размер','Цена, ₽','Доступность','Действие'])headers.append(node('th',h));
  thead.append(headers);const tbody=node('tbody');table.append(thead,tbody);tableWrap.append(table);
  for(const item of rows){
   const tr=node('tr'),priceCell=node('td'),price=node('input'),draft=catalogDrafts.get(item.id);
   price.type='number';price.min='1';price.max='100000000';price.step='1';price.value=draft?.price??String(item.price);price.className='sa-price-input';price.setAttribute('aria-label','Цена '+item.sku+' '+item.size);priceCell.append(price);
   const activeCell=node('td'),label=node('label',undefined,'sa-active-toggle'),active=node('input');active.type='checkbox';active.checked=draft?.active??item.active;label.append(active,node('span',active.checked?'Активен':'Неактивен'));activeCell.append(label);
   const action=node('td'),save=node('button','Сохранить','sa-status-save');save.type='button';
   function changed(){
    label.lastChild.textContent=active.checked?'Активен':'Неактивен';
    const dirty=price.value!==String(item.price)||active.checked!==item.active;
    if(dirty)catalogDrafts.set(item.id,{price:price.value,active:active.checked});else catalogDrafts.delete(item.id);
    save.disabled=!price.checkValidity()||price.value===''||!dirty;
   }
   price.addEventListener('input',changed);active.addEventListener('change',changed);
   save.addEventListener('click',()=>editVariant(item,Number(price.value),active.checked,save));action.append(save);
   tr.append(node('td',item.size),priceCell,activeCell,action);tbody.append(tr);changed();
  }
  card.append(tableWrap);target.append(card);
 }
 if(!list.length)target.append(node('p','Нет подходящих вариантов.','sa-empty'));
}
async function load(more){
 if(busy||dashboard.hidden||tab==='overview')return;
 const current=generation,key=tab,isOrders=key==='orders';busy=true;
 const cursor=isOrders?orderCursor:catalogCursor;
 const moreButton=$(isOrders?'[data-orders-more]':'[data-catalog-more]');
 moreButton.disabled=true;message.textContent='Загружаем…';
 try{
  const data=await get(isOrders?'/api/admin/orders'+(more&&cursor?'?before='+encodeURIComponent(cursor):''):'/api/admin/catalog'+(more&&cursor?'?after='+encodeURIComponent(cursor):''));
  if(current!==generation)return;
  const list=isOrders?data.orders:data.variants;
  if(!Array.isArray(list)||list.length>(isOrders?20:100))throw Error();
  if(isOrders){
   if(!list.every(o=>o&&typeof o.number==='string'&&typeof o.status==='string'&&Number.isSafeInteger(o.total)&&Array.isArray(o.items)))throw Error();
   orders=more?[...orders,...list]:list;orderCursor=data.nextBefore;
   renderOrders();moreButton.hidden=!orderCursor;
  }else{
   if(!list.every(v=>v&&typeof v.sku==='string'&&typeof v.title==='string'&&Number.isSafeInteger(v.price)&&typeof v.active==='boolean'))throw Error();
   variants=more?[...variants,...list]:list;catalogCursor=data.nextAfter;
   renderCatalog();moreButton.hidden=!catalogCursor;
  }message.textContent='';
 }catch(err){failure(err,current);}
 finally{if(current===generation){busy=false;moreButton.disabled=false;}}
}
all('[data-tab]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.tab)));
$('[data-refresh]').addEventListener('click',boot);$('[data-retry]').addEventListener('click',boot);
$('[data-orders-more]').addEventListener('click',()=>load(true));$('[data-catalog-more]').addEventListener('click',()=>load(true));
$('[data-order-search]').addEventListener('input',renderOrders);$('[data-order-filter]').addEventListener('change',renderOrders);$('[data-catalog-search]').addEventListener('input',renderCatalog);
$('[data-reference]').addEventListener('click',async()=>{
 const current=generation;reference='';$('[data-code]').hidden=true;$('[data-copy]').hidden=true;
 $('[data-enroll-status]').textContent='Получаем код…';
 try{const r=await get('/api/admin/session?enroll=1');if(current!==generation)return;
 if(!/^[a-f0-9]{64}$/.test(r.reference))throw Error();
 reference=r.reference;$('[data-code]').textContent=reference;$('[data-code]').hidden=false;$('[data-copy]').hidden=false;
 $('[data-enroll-status]').textContent='Вставьте код только в терминал сервера. Сессия должна быть создана менее 10 минут назад.';
 }catch{if(current===generation)$('[data-enroll-status]').textContent='Не удалось получить код. Войдите заново и повторите.';}
});
$('[data-copy]').addEventListener('click',async()=>{if(!reference)return;try{await navigator.clipboard.writeText(reference);$('[data-enroll-status]').textContent='Код скопирован.';}catch{$('[data-enroll-status]').textContent='Выделите код и скопируйте вручную.';}});
$('[data-logout]').addEventListener('click',async()=>{clear();$('[data-gate-status]').textContent='Выходим…';try{const r=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(r.status!==204)throw Error();deny('Вы вышли из аккаунта.',true);}catch{deny('Не удалось подтвердить выход. Повторите проверку.');}});
window.addEventListener('pagehide',clear);window.addEventListener('pageshow',e=>{if(e.persisted)boot();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();}else boot();});
boot();
})();
