(() => {
'use strict';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const gate=$('[data-gate]'),dashboard=$('[data-dashboard]'),message=$('[data-message]');
let generation=0,tab='overview',busy=false,orders=[],variants=[],orderCursor=null,catalogCursor=null,reference='';
let marker=null,mutationBusy=false;
const catalogDrafts=new Map(),expandedProducts=new Set();
const createDialog=$('[data-create-dialog]'),createForm=$('[data-create-form]'),createStatus=$('[data-create-status]');
let createExisting=false;
const photoDialog=$('[data-photo-dialog]'),photoForm=$('[data-photo-form]'),photoList=$('[data-photo-list]'),photoStatus=$('[data-photo-status]');
let photoSku=null,photoGeneration=0,photoRecords=[];
const detailsDialog=$('[data-details-dialog]'),detailsForm=$('[data-details-form]'),detailsStatus=$('[data-details-status]');
const detailsKeys=['title','finish','category','description','material','specs','leadTime'];
const displayKeys=['productTitle','eyebrow','productFinish'];
let detailsSku=null,detailsRevision=null,detailsGeneration=0,displaySupported=false;
const previewDialog=$('[data-preview-dialog]'),previewBody=$('[data-preview-body]'),previewStatus=$('[data-preview-status]');
let previewGeneration=0;
const reviewDialog=$('[data-review-dialog]'),reviewBody=$('[data-review-body]'),reviewStatus=$('[data-review-status]');
let reviewGeneration=0;
const transitions={'Новая заявка':['Подтверждён','Отменён'],'Подтверждён':['Ожидает оплаты','В производстве','Отменён'],'Ожидает оплаты':['В производстве','Отменён'],'В производстве':['Отправлен','Отменён'],'Отправлен':['Получен']};
const originOK=location.origin==='https://gerbrf.ru';
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
const date=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}):'—';};
function clear(){
 generation++;busy=false;marker=null;reference='';clearPhotos();clearDetails();clearPreview();clearReview();if(createDialog.open)createDialog.close();createForm.reset();createStatus.textContent='';catalogDrafts.clear();expandedProducts.clear();orders=[];variants=[];orderCursor=null;catalogCursor=null;
 dashboard.hidden=true;gate.hidden=false;$('[data-logout]').hidden=true;
 for(const s of ['[data-stats]','[data-intake]','[data-orders]','[data-catalog]','[data-release]','[data-code]'])$(s).replaceChildren();
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
 }catch(err){if(current!==generation)return;deny(err.status===401?'Войдите в личный кабинет.':err.status===403?'Административный доступ не подтверждён. Если вы владелец, войдите заново через Яндекс ID (административная сессия действует 12 часов).':'Не удалось проверить доступ. Повторите попытку.',err.status===401||err.status===403,err.status===403);}
}
async function select(key){
 tab=key;const current=++generation;busy=false;
 all('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===key)));
 all('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==key);
 $('[data-title]').textContent={overview:'Обзор',orders:'Заказы',catalog:'Товары',publication:'Публикация'}[key];
 // Drop private data from inactive panels.
 orders=[];variants=[];orderCursor=null;catalogCursor=null;
 $('[data-orders]').replaceChildren();$('[data-catalog]').replaceChildren();$('[data-release]').replaceChildren();
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
 }else if(key==='publication')await loadRelease(current);
 else await load(false);
}

function validRelease(data){
 const p=data?.preflight;
 return data&&['published','intakeEnabled'].every(k=>typeof data[k]==='boolean')&&typeof data.revision==='string'&&/^[a-f0-9]{64}$/.test(data.revision)&&Array.isArray(data.queue)&&p&&typeof p.eligible==='boolean'&&['products','queued','ready','selectedVariants','approved'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)&&Array.isArray(p.entries)&&p.entries.every(e=>typeof e.sku==='string'&&/^[0-9]{4}$/.test(e.sku)&&typeof e.valid==='boolean'&&Number.isSafeInteger(e.selected)&&Array.isArray(e.issues));
}
function renderRelease(data){
 const target=$('[data-release]'),p=data.preflight;
 target.replaceChildren();
 const stats=node('div',undefined,'sa-stats');
 for(const [label,value] of [['Всего товаров',p.products],['В очереди',p.queued],['Проверено',p.ready],['Выбрано размеров',p.selectedVariants],['Опубликовано',p.approved]]){
  const item=node('article',undefined,'sa-stat');item.append(node('span',label),node('strong',value));stats.append(item);
 }
 target.append(stats);
 const state=node('section',undefined,'sa-release-card');
 state.append(node('h2',data.published?'Серверный каталог опубликован':'Публикация закрыта'),node('p','Приём заказов: '+(data.intakeEnabled?'открыт':'закрыт'),'sa-note'));
 state.append(node('p',data.published?'Для редактирования закройте серверную витрину. Закрытие сохраняет карточки, цены и фотографии, но очищает очередь.':'Публикуются только проверенные карточки и выбранные размеры. Приём заказов не открывается. Старые статические страницы пока существуют отдельно.','sa-note'));
 const actions=node('div',undefined,'sa-release-actions'),refresh=node('button','Проверить очередь'),button=node('button',data.published?'Закрыть серверную витрину':'Опубликовать серверный каталог','sa-status-save');
 refresh.type=button.type='button';refresh.onclick=()=>{if(!mutationBusy)select('publication');};button.disabled=data.intakeEnabled||(!data.published&&!p.eligible);
 button.onclick=()=>changeRelease(data,button);actions.append(refresh,button);state.append(actions);target.append(state);
 if(!data.published&&!p.entries.length)target.append(node('p','Очередь пуста. Подтвердите готовность товара и добавьте его в очередь в разделе «Товары».','sa-note'));
 if(!data.published)for(const e of p.entries){
  const row=node('div',undefined,'sa-review-checklist');row.append(node('strong','Арт. '+e.sku+' · '+(e.valid?'Готов':'Требует проверки')),node('p','Размеров: '+e.selected,'sa-note'));
  const labels={...issueNames,stale:'Требуется повторное подтверждение',selection:'Выбранные размеры изменились',metadata:'Различаются данные вариантов'};
  for(const issue of e.issues)row.append(node('p',labels[issue]||'Проверьте карточку'));
  target.append(row);
 }
}
async function loadRelease(current){
 const session=marker;
 try{
  const r=await fetch('/api/admin/catalog/review?release=1',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Session-Marker':session},signal:AbortSignal.timeout(35000)});
  if(current!==generation||session!==marker)return;
  if(!r.ok){const e=Error();e.status=r.status;throw e;}
  const data=await r.json();if(current!==generation||session!==marker)return;
  if(!validRelease(data))throw Error();renderRelease(data);message.textContent='';
 }catch(e){failure(e,current);}
}
async function changeRelease(data,button){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='publication'||data.intakeEnabled||(!data.published&&!data.preflight.eligible))return;
 const action=data.published?'close':'publish';
 const prompt=action==='publish'?'Опубликовать '+data.preflight.ready+' товаров и '+data.preflight.selectedVariants+' размеров в серверном каталоге? Проверьте реальные цены, фото и сроки. Приём заказов останется закрытым.':'Закрыть серверный каталог? Очередь будет очищена. Товары, цены и фотографии сохранятся.';
 if(!window.confirm(prompt))return;
 const current=generation,session=marker;mutationBusy=true;button.disabled=true;
 try{
  const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({action,expected:data.revision}),signal:AbortSignal.timeout(35000)});
  if(current!==generation||session!==marker)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok){await select('publication');message.textContent='Действие отклонено. Проверьте актуальное состояние.';return;}
  const result=await r.json();if(current!==generation||session!==marker)return;
  if(!validRelease(result)||result.published!==(action==='publish')||result.intakeEnabled)throw Error();
  renderRelease(result);message.textContent=action==='publish'?'Серверный каталог опубликован. Приём заказов закрыт.':'Серверный каталог закрыт.';
 }catch{if(current===generation){message.textContent='Не удалось подтвердить результат. Обновите состояние перед повтором.';}}
 finally{mutationBusy=false;}
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
async function nextSku(session){
 const r=await fetch('/api/admin/catalog/review?nextSku=1',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Session-Marker':session},signal:AbortSignal.timeout(12000)});
 if(r.status===401||r.status===403){if(session===marker)deny('Доступ закрыт. Войдите заново.',true);throw Error();}
 if(!r.ok)throw Error();
 const data=await r.json();if(typeof data.sku!=='string'||!/^[0-9]{4}$/.test(data.sku))throw Error();return data.sku;
}
let createSuggestion=0;
async function openCreate(existingSku=null){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 createExisting=existingSku!==null;createForm.reset();createStatus.textContent='';
 $('[data-create-dialog] h2').textContent=createExisting?'Добавить размер':'Новый товар';
 createForm.elements.sku.value=existingSku||'';
 createForm.elements.sku.readOnly=createExisting;
 for(const label of all('[data-create-meta]')){
  label.hidden=createExisting;
  const input=label.querySelector('input');input.disabled=createExisting;
 }
 createForm.elements.title.required=!createExisting;
 createDialog.showModal();
 (createExisting?createForm.elements.size:createForm.elements.sku).focus();
 const request=++createSuggestion,session=marker;
 if(!createExisting){
  createStatus.textContent='Подбираем свободный артикул…';
  try{const sku=await nextSku(session);if(request===createSuggestion&&session===marker&&createDialog.open&&!createExisting){if(!createForm.elements.sku.value)createForm.elements.sku.value=sku;createStatus.textContent='';}}
  catch{if(request===createSuggestion&&session===marker&&createDialog.open&&!createExisting)createStatus.textContent='Не удалось предложить артикул. Введите свободный номер вручную.';}
 }
}
$('[data-new-product]').addEventListener('click',()=>openCreate());
all('[data-create-cancel]').forEach(b=>b.addEventListener('click',()=>{if(!mutationBusy)createDialog.close();}));
createDialog.addEventListener('cancel',e=>{if(mutationBusy)e.preventDefault();});
createForm.addEventListener('submit',async e=>{
 e.preventDefault();if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 const value=k=>createForm.elements[k].value.trim();
 const m=value('size').match(/^([0-9]{1,5}(?:[,.][0-9]{1,2})?)\s*[×хx]\s*([0-9]{1,5}(?:[,.][0-9]{1,2})?)(?:\s*см)?$/iu);
 if(!m||Number(m[1].replace(',','.'))<=0||Number(m[2].replace(',','.'))<=0){createStatus.textContent='Укажите размер, например 42 × 50 см.';return;}
 const p={sku:value('sku'),existing:createExisting,title:createExisting?'':value('title'),finish:createExisting?'':value('finish'),size:m[1].replace('.',',')+' × '+m[2].replace('.',',')+' см',price:Number(value('price'))};
 if(!/^[0-9]{4}$/.test(p.sku)||!Number.isSafeInteger(p.price)||p.price<1||p.price>100000000||(!p.existing&&!p.title)){createStatus.textContent='Проверьте артикул, название и цену.';return;}
 const current=generation,session=marker,submit=$('[data-create-submit]');
 mutationBusy=true;submit.disabled=true;createStatus.textContent='Сохраняем черновик…';
 try{
  const r=await fetch('/api/admin/catalog/create',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify(p),signal:AbortSignal.timeout(12000)});
  if(current!==generation)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  const data=await r.json();
  if(r.status!==201){
   const errors={duplicate_variant:'Артикул или этот размер уже существует.',sku_not_found:'Товар не найден. Обновите каталог.',invalid_request:'Проверьте заполненные поля.',intake_open:'Закройте приём заказов перед добавлением.',session_changed:'Сессия изменилась. Обновите панель.'};
   createStatus.textContent=errors[data.error]||'Не удалось подтвердить сохранение. Проверьте каталог перед повтором.';return;
  }
  if(data.sku!==p.sku||data.size!==p.size||data.active!==false||data.storefrontReady!==false||typeof data.id!=='string')throw Error();
  createDialog.close();createForm.reset();
  // A confirmed new record is displayed immediately, with no duplicate id.
  variants=variants.filter(v=>v.id!==data.id);variants.push(data);expandedProducts.add(p.sku);
  $('[data-catalog-search]').value=p.sku;renderCatalog();
  message.textContent='Черновик сохранён. Публикация отключена.';
 }catch{if(current===generation)createStatus.textContent='Не удалось подтвердить создание. Обновите список, прежде чем повторять.';}
 finally{mutationBusy=false;submit.disabled=false;}
});
function clearPhotos(){
 photoGeneration++;photoSku=null;photoRecords=[];photoList.replaceChildren();photoForm.reset();photoStatus.textContent='';
 if(photoDialog.open)photoDialog.close();
}
async function loadPhotos(sku,current){
 photoStatus.textContent='Загружаем галерею…';
 try{
  const data=await get('/api/admin/catalog/photos?sku='+encodeURIComponent(sku));
  if(current!==photoGeneration||!photoDialog.open)return;
  if(!Array.isArray(data.photos)||data.photos.length>8||!data.photos.every(p=>p.sku===sku&&/^[0-9a-f-]{36}$/.test(p.id)&&Number.isInteger(p.width)&&Number.isInteger(p.height)))throw Error();
  photoRecords=data.photos;
  renderPhotoRecords();
  photoStatus.textContent=data.photos.length+' из 8 фотографий';
  $('[data-photo-submit]').disabled=data.photos.length>=8;
 }catch(e){if(current===photoGeneration){photoStatus.textContent='Не удалось загрузить галерею. Закройте и откройте её заново.';if(e.status===401||e.status===403)deny('Доступ закрыт. Войдите заново.',true);}}
}
function renderPhotoRecords(){
  photoList.replaceChildren();
  for(const [index,p] of photoRecords.entries()){
   const fig=node('figure',undefined,'sa-photo-item'),im=node('img');im.alt='Фото товара';im.loading='lazy';im.src='/api/admin/catalog/photo?id='+encodeURIComponent(p.id);
   fig.append(im,node('figcaption',p.width+' × '+p.height+' px','sa-note'));
   const main=node('button',index===0?'Главное фото':'Сделать главным','sa-photo-main');main.type='button';main.disabled=index===0;
   main.addEventListener('click',()=>changeGallery([p.id,...photoRecords.filter(x=>x.id!==p.id).map(x=>x.id)]));
   const actions=node('div',undefined,'sa-photo-actions');
   const move=(delta,label,aria)=>{const b=node('button',label);b.type='button';b.setAttribute('aria-label',aria);b.disabled=index+delta<0||index+delta>=photoRecords.length;
    b.addEventListener('click',()=>{const next=photoRecords.map(x=>x.id);[next[index],next[index+delta]]=[next[index+delta],next[index]];changeGallery(next);});return b;};
   const remove=node('button','Удалить','sa-photo-delete');remove.type='button';
   remove.addEventListener('click',()=>{if(window.confirm('Удалить эту фотографию из галереи?'))changeGallery(photoRecords.filter(x=>x.id!==p.id).map(x=>x.id));});
   actions.append(move(-1,'←','Переместить фото раньше'),move(1,'→','Переместить фото позже'),remove);
   fig.append(main,actions);photoList.append(fig);
  }
  if(!photoRecords.length)photoList.append(node('p','Загруженных фотографий пока нет.','sa-note'));
}
async function changeGallery(next){
 if(mutationBusy||!marker||!photoSku||!photoDialog.open||dashboard.hidden)return;
 const current=photoGeneration,session=marker,sku=photoSku,expected=photoRecords.map(x=>x.id);
 mutationBusy=true;photoStatus.textContent='Сохраняем галерею…';
 try{
  const r=await fetch('/api/admin/catalog/photos/manage',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({sku,expected,next}),signal:AbortSignal.timeout(12000)});
  if(current!==photoGeneration)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok){await loadPhotos(sku,current);if(current===photoGeneration)photoStatus.textContent='Не удалось изменить галерею. Проверьте актуальный список.';return;}
  const result=await r.json();
  if(!Array.isArray(result.photos)||result.photos.map(x=>x.id).join(',')!==next.join(','))throw Error();
  await loadPhotos(sku,current);
 }catch{if(current===photoGeneration)photoStatus.textContent='Не удалось подтвердить изменение. Закройте и откройте галерею перед повтором.';}
 finally{mutationBusy=false;}
}
function openPhotos(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearPhotos();photoSku=sku;$('[data-photo-title]').textContent='Артикул '+sku;photoDialog.showModal();$('[data-photo-submit]').disabled=true;loadPhotos(sku,photoGeneration);
}
$('[data-photo-close]').addEventListener('click',()=>{if(!mutationBusy)clearPhotos();});
photoDialog.addEventListener('cancel',e=>{e.preventDefault();if(!mutationBusy)clearPhotos();});
photoForm.addEventListener('submit',async e=>{
 e.preventDefault();
 if(mutationBusy||!marker||!photoSku||!photoDialog.open||dashboard.hidden)return;
 const file=photoForm.elements.image.files[0],sku=photoSku,current=photoGeneration,session=marker,submit=$('[data-photo-submit]');
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>30*1024*1024){photoStatus.textContent='Выберите JPG, PNG или WebP до 30 МБ.';return;}
 mutationBusy=true;submit.disabled=true;photoStatus.textContent='Подготавливаем изображение…';
 let bitmap;
 try{
  bitmap=await createImageBitmap(file);
  if(bitmap.width*bitmap.height>50000000)throw Error('dimensions');
  const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
  if(scale<1&&!window.confirm('Исходный размер '+bitmap.width+' × '+bitmap.height+' px. Для галереи будет создана копия '+Math.max(1,Math.round(bitmap.width*scale))+' × '+Math.max(1,Math.round(bitmap.height*scale))+' px. Оригинал на вашем компьютере останется без изменений. Продолжить?')){photoStatus.textContent='Загрузка отменена. Оригинал не изменён.';return;}
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error();
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  canvas.width=canvas.height=1;
  if(!blob||blob.size>8*1024*1024){if(current===photoGeneration)photoStatus.textContent='PNG-копия превышает 8 МБ. Выберите изображение меньшего размера.';return;}
  if(current!==photoGeneration||session!==marker)return;
  photoStatus.textContent='Загружаем фотографию…';
  const r=await fetch('/api/admin/catalog/photo/upload?sku='+encodeURIComponent(sku),{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'image/png','X-Session-Marker':session},body:blob,signal:AbortSignal.timeout(30000)});
  if(current!==photoGeneration)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  const data=await r.json();
  if(r.status!==201){photoStatus.textContent=data.error==='photo_quota'?'Лимит галереи или хранилища исчерпан.':data.error==='session_changed'?'Сессия изменилась. Обновите панель.':'Не удалось загрузить фото. Проверьте формат и размер.';return;}
  if(data.sku!==sku||typeof data.id!=='string')throw Error();
  photoForm.reset();await loadPhotos(sku,current);
 }catch{if(current===photoGeneration)photoStatus.textContent='Не удалось подтвердить загрузку. Проверьте галерею перед повтором.';}
 finally{bitmap?.close();mutationBusy=false;if(current===photoGeneration&&photoList.querySelectorAll('figure').length<8)submit.disabled=false;}
});
function clearDetails(){
 detailsGeneration++;detailsSku=null;detailsRevision=null;detailsForm.reset();detailsStatus.textContent='';$('[data-details-submit]').disabled=true;
 if(detailsDialog.open)detailsDialog.close();
}
async function openDetails(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearDetails();detailsSku=sku;const current=detailsGeneration;
 $('[data-details-sku]').textContent='Артикул '+sku;detailsDialog.showModal();detailsStatus.textContent='Загружаем карточку…';
 try{
  const data=await get('/api/admin/catalog/product?sku='+encodeURIComponent(sku));
  if(current!==detailsGeneration||!detailsDialog.open)return;
  if(data.sku!==sku||typeof data.revision!=='string'||!/^[a-f0-9]{64}$/.test(data.revision)||!detailsKeys.every(k=>typeof data.fields?.[k]==='string'))throw Error();
  displaySupported=displayKeys.every(k=>typeof data.fields[k]==='string');
  for(const label of detailsForm.querySelectorAll('[data-display-field]'))label.hidden=!displaySupported;
  for(const k of [...detailsKeys,...displayKeys])detailsForm.elements[k].value=data.fields[k]||'';
  detailsRevision=data.revision;detailsStatus.textContent='';$('[data-details-submit]').disabled=false;
 }catch(e){if(current===detailsGeneration){detailsStatus.textContent='Не удалось загрузить карточку.';if(e.status===401||e.status===403)deny('Доступ закрыт. Войдите заново.',true);}}
}
all('[data-details-close]').forEach(b=>b.addEventListener('click',()=>{if(!mutationBusy)clearDetails();}));
detailsDialog.addEventListener('cancel',e=>{e.preventDefault();if(!mutationBusy)clearDetails();});
detailsForm.addEventListener('submit',async e=>{
 e.preventDefault();if(mutationBusy||!marker||!detailsSku||!detailsRevision||dashboard.hidden||!detailsDialog.open)return;
 const sku=detailsSku,current=detailsGeneration,session=marker,submit=$('[data-details-submit]');
 const fields=Object.fromEntries([...detailsKeys,...(displaySupported?displayKeys:[])].map(k=>[k,detailsForm.elements[k].value.trim()]));
 if(!fields.title){detailsStatus.textContent='Укажите название.';return;}
 if(!window.confirm('Сохранить карточку артикула '+sku+'? При изменении все его размеры перейдут в черновик.'))return;
 mutationBusy=true;submit.disabled=true;detailsStatus.textContent='Сохраняем…';
 try{
  const r=await fetch('/api/admin/catalog/product/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({sku,expected:detailsRevision,fields}),signal:AbortSignal.timeout(12000)});
  if(current!==detailsGeneration)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  const data=await r.json();
  if(!r.ok){detailsStatus.textContent=data.error==='details_changed'?'Карточка изменилась. Закройте и откройте редактор заново.':data.error==='publication_open'?'Перед изменением снимите этот товар с публикации и закройте приём заказов.':'Не удалось сохранить. Проверьте поля.';return;}
  if(data.sku!==sku||typeof data.revision!=='string')throw Error();
  clearDetails();catalogDrafts.clear();expandedProducts.add(sku);$('[data-catalog-search]').value=sku;
  await select('catalog');message.textContent='Карточка сохранена в серверном каталоге.';
 }catch{if(current===detailsGeneration)detailsStatus.textContent='Не удалось подтвердить сохранение. Проверьте карточку перед повтором.';}
 finally{mutationBusy=false;if(current===detailsGeneration)submit.disabled=false;}
});
function clearPreview(){
 previewGeneration++;previewBody.replaceChildren();previewStatus.textContent='';
 if(previewDialog.open)previewDialog.close();
}
const categoryNames={rf:'Гербы РФ',region:'Гербы субъектов РФ',city:'Гербы городов РФ',department:'Эмблемы ведомств',other:'Категория не выбрана'};
async function renderPreview(data,current,session){
 const {renderProductCard}=await import('./storefront-product.js?v=20261128-promo1');
 if(current!==previewGeneration||session!==marker)return;
 const f=data.fields,photos=data.photos.map(p=>({id:'/api/admin/catalog/photo?id='+encodeURIComponent(p.id)}));
 if(!photos.length&&data.legacyImage){
  try{const u=new URL(data.legacyImage,location.href);if(u.origin===location.origin&&/\.(png|jpe?g|webp)$/i.test(u.pathname)&&!u.pathname.startsWith('/api/'))photos.push({id:u.pathname+u.search});}catch{}
 }
 const host=node('div',undefined,'sa-storefront-preview'),root=host.attachShadow({mode:'open'});
 host.hidden=true;previewBody.replaceChildren(host);
 const body=node('body',undefined,'product-paint-page');body.dataset.dynamicPage='product';
 const section=node('section',undefined,'product-final ds-main'),target=node('div',undefined,'container');section.append(target);body.append(section);
 const html=node('html');html.append(body);root.append(html);
 const styles=['styles.css?v=20261128-shared1','shop.css?v=20261128-promo1','mobile.css?v=20261124-header-search3','dynamic-storefront.css?v=20261128-layout2'];
 await Promise.all(styles.map(path=>new Promise((resolve,reject)=>{
  const link=node('link');link.rel='stylesheet';link.href=path;link.onload=resolve;link.onerror=reject;root.insertBefore(link,html);
 })));
 if(current!==previewGeneration||session!==marker)return;
 const makePhoto=(url,alt)=>{const im=node('img');im.alt=alt;im.src=url;im.decoding='async';return im;};
 renderProductCard({...f,sku:data.sku,photos,variants:[...data.variants].sort((a,b)=>a.size.localeCompare(b.size,'ru',{numeric:true}))},{target,makePhoto,preview:true,zoomRoot:body});
 host.hidden=false;
}
async function openPreview(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearPreview();const current=previewGeneration,session=marker;previewDialog.showModal();previewStatus.textContent='Загружаем сохранённые данные…';
 try{
  const r=await fetch('/api/admin/catalog/preview?sku='+encodeURIComponent(sku),{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Session-Marker':session},signal:AbortSignal.timeout(12000)});
  if(current!==previewGeneration||session!==marker)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok)throw Error();
  const data=await r.json();
  if(current!==previewGeneration||session!==marker)return;
  if(data.sku!==sku||!detailsKeys.every(k=>typeof data.fields?.[k]==='string')||!Array.isArray(data.variants)||!data.variants.length||!data.variants.every(v=>typeof v.size==='string'&&Number.isSafeInteger(v.price)&&v.price>0&&typeof v.active==='boolean'&&typeof v.storefrontReady==='boolean')||!Array.isArray(data.photos)||data.photos.length>8||!data.photos.every(p=>p.sku===sku&&/^[0-9a-f-]{36}$/.test(p.id)))throw Error();
  await renderPreview(data,current,session);if(current===previewGeneration&&session===marker)previewStatus.textContent='';
 }catch{if(current===previewGeneration)previewStatus.textContent='Не удалось открыть предпросмотр. Обновите панель.';}
}
all('[data-preview-close]').forEach(b=>b.addEventListener('click',clearPreview));
previewDialog.addEventListener('cancel',e=>{e.preventDefault();clearPreview();});
function clearReview(){
 reviewGeneration++;reviewBody.replaceChildren();reviewStatus.textContent='';
 if(reviewDialog.open)reviewDialog.close();
 reviewDialog.removeAttribute('data-copy-mode');$('#sa-review-title').textContent='Подготовка к публикации';$('[data-review-intro]').hidden=false;
}
const reviewNames={draft:'Черновик',ready:'Готов к публикации',stale:'Требуется повторная проверка',archived:'В архиве'};
const issueNames={category:'Выберите категорию',description:'Заполните описание',photos:'Загрузите хотя бы одну фотографию',sizes:'Добавьте размер'};
function validIndividual(d,sku){
 return d?.sku===sku&&validReview(d.review,sku)&&['published','intakeEnabled','listed','canPublish','canUnpublish'].every(k=>typeof d[k]==='boolean')&&typeof d.revision==='string'&&/^[a-f0-9]{64}$/.test(d.revision);
}
async function fetchIndividual(sku,session){
 const r=await fetch('/api/admin/catalog/review?individual=1&sku='+encodeURIComponent(sku),{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Session-Marker':session},signal:AbortSignal.timeout(12000)});
 if(r.status===401||r.status===403){if(session===marker)deny('Доступ закрыт. Войдите заново.',true);throw Error();}
 if(!r.ok)throw Error();
 const data=await r.json();if(!validIndividual(data,sku))throw Error();return data;
}
async function changeIndividual(data,button){
 if(mutationBusy||!marker||!reviewDialog.open||dashboard.hidden||tab!=='catalog'||(!data.canPublish&&!data.canUnpublish))return;
 const action=data.listed?'unpublish':'publish';
 if(!window.confirm(action==='publish'?'Опубликовать товар арт. '+data.sku+' с проверенными ценами и размерами?':'Снять товар арт. '+data.sku+' с витрины? Остальные товары останутся опубликованными.'))return;
 const current=reviewGeneration,session=marker;mutationBusy=true;button.disabled=true;reviewStatus.textContent='Обновляем публикацию…';
 try{
  const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({sku:data.sku,action,expected:data.revision}),signal:AbortSignal.timeout(12000)});
  if(current!==reviewGeneration||session!==marker)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok)throw Error();
  const result=await r.json();if(current!==reviewGeneration||session!==marker)return;
  if(!validIndividual(result,data.sku)||result.listed!==(action==='publish'))throw Error();
  catalogDrafts.clear();expandedProducts.add(data.sku);await select('catalog');
  if(current===reviewGeneration&&session===marker){renderReview(result.review,result);reviewStatus.textContent=action==='publish'?'Товар опубликован.':'Товар снят с витрины. Можно редактировать.';}
  else if(session===marker)message.textContent=action==='publish'?'Товар опубликован.':'Товар снят с витрины.';
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить действие. Откройте проверку заново.';}
 finally{mutationBusy=false;}
}
function renderReview(data,individual){
 reviewBody.replaceChildren();
 if(individual){
  const info=node('div',undefined,'sa-review-checklist');
  info.append(node('strong',individual.listed?'Опубликован на витрине':'Не опубликован'),node('p',individual.intakeEnabled?'При открытом приёме заказов изменение публикации пока заблокировано.':individual.published?'Управление публикацией этого артикула.':'Серверная витрина закрыта. Подготовьте товар к общей публикации.','sa-note'));
  if(individual.canPublish||individual.canUnpublish){
   const b=node('button',individual.listed?'Снять с публикации':'Опубликовать товар','sa-status-save');b.type='button';b.onclick=()=>changeIndividual(individual,b);info.append(b);
  }
  reviewBody.append(info);
  if(individual.listed||individual.intakeEnabled){reviewBody.append(node('p',individual.listed?'Для редактирования сначала снимите товар с публикации.':'Редактирование пока закрыто.','sa-note'));return;}
 }
 reviewBody.append(node('h3',reviewNames[data.state]),node('p','Проверьте фотографии, описание и реальные цены поставщика в предпросмотре.','sa-note'));
 const publicationNames={none:'Не включён в очередь публикации',prepared:'В очереди публикации',stale:'Очередь: требуется повторное подтверждение'};
 reviewBody.append(node('strong',publicationNames[data.publicationState]),node('p','Очередь не открывает витрину и не активирует продажу.','sa-note'));
 const checklist=node('div',undefined,'sa-review-checklist');
 if(data.issues.length)for(const issue of data.issues)checklist.append(node('p',issueNames[issue]||'Проверьте карточку'));
 else checklist.append(node('p','Обязательные поля заполнены.','sa-note'));
 reviewBody.append(checklist);
 const list=node('div',undefined,'sa-review-sizes'),checks=[];
 if(data.state!=='archived'){
  reviewBody.append(node('h3','Размеры для будущей публикации'));
  for(const v of [...data.variants].sort((a,b)=>a.size.localeCompare(b.size,'ru',{numeric:true}))){
   const label=node('label',undefined,'sa-review-size'),check=node('input');check.type='checkbox';check.value=v.id;
   check.checked=data.selected.includes(v.id);
   const txt=node('span',v.size);label.append(check,txt,node('strong',money(v.price)));list.append(label);checks.push(check);
  }
  reviewBody.append(list);
 }
 const actions=node('div',undefined,'sa-review-actions');
 const button=(name,cls,fn)=>{const b=node('button',name,cls);b.type='button';b.addEventListener('click',fn);actions.append(b);return b;};
 const selected=()=>checks.filter(c=>c.checked).map(c=>c.value);
 if(data.state!=='archived'){
  const ready=button('Подтвердить готовность','sa-status-save',()=>{if(window.confirm('Подтвердить выбранные размеры и текущие цены? Товар пока не публикуется.'))saveReview(data,'ready',selected());});
  const update=()=>ready.disabled=data.issues.length>0||selected().length===0||selected().length>100;
  checks.forEach(c=>c.addEventListener('change',update));update();
  if(data.state==='ready'&&data.publicationState!=='prepared'){
   const prepare=button('В очередь публикации','sa-status-save',()=>{if(window.confirm('Включить товар с подтверждёнными размерами и ценами в очередь? Покупатели пока его не увидят.'))saveReview(data,'prepare',data.selected);});
   const sameSelection=()=>{const values=selected();return values.length===data.selected.length&&values.every(id=>data.selected.includes(id));};
   const syncPrepare=()=>{prepare.disabled=data.issues.length>0||data.selected.length===0||!sameSelection();};
   checks.forEach(c=>c.addEventListener('change',syncPrepare));syncPrepare();
  }
  if(data.publicationState!=='none')button('Убрать из очереди','',()=>{if(window.confirm('Убрать товар из очереди публикации? Проверка готовности и данные сохранятся.'))saveReview(data,'cancel',[]);});
  if(data.state!=='draft')button('Вернуть в черновик','',()=>saveReview(data,'draft',[]));
  button('В архив','',()=>{if(window.confirm('Переместить товар в архив? Все размеры будут отключены, данные и фотографии сохранятся.'))saveReview(data,'archived',[]);});
 }else button('Восстановить черновик','sa-status-save',()=>saveReview(data,'draft',[]));
 reviewBody.append(actions);
}
function validReview(d,sku){
 return d?.sku===sku&&Object.hasOwn(reviewNames,d.state)&&['none','prepared','stale'].includes(d.publicationState)&&typeof d.revision==='string'&&/^[a-f0-9]{64}$/.test(d.revision)&&Array.isArray(d.issues)&&Array.isArray(d.selected)&&Array.isArray(d.variants)&&d.variants.every(v=>typeof v.id==='string'&&typeof v.size==='string'&&Number.isSafeInteger(v.price));
}
async function openPublicationSummary(){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearReview();const current=reviewGeneration,session=marker;
 $('[data-review-sku]').textContent='Весь ассортимент';
 reviewDialog.showModal();reviewStatus.textContent='Проверяем очередь публикации…';
 try{
  const r=await fetch('/api/admin/catalog/review?summary=1',{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json','X-Session-Marker':session},signal:AbortSignal.timeout(35000)});
  if(current!==reviewGeneration||session!==marker)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok)throw Error();
  const data=await r.json();
  if(current!==reviewGeneration||session!==marker)return;
  if(!data||!['published','intakeEnabled','eligible'].every(k=>typeof data[k]==='boolean')||
   !['products','queued','ready','selectedVariants','approved'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0)||
   !Array.isArray(data.entries)||data.entries.length!==data.queued||
   !data.entries.every(e=>typeof e.sku==='string'&&/^[0-9]{4}$/.test(e.sku)&&typeof e.valid==='boolean'&&Number.isSafeInteger(e.selected)&&Array.isArray(e.issues)))throw Error();
  reviewBody.replaceChildren();
  reviewBody.append(node('h3',data.eligible?'Очередь прошла проверку':'Очередь требует подготовки'),
   node('p','Всего товаров: '+data.products+' · В очереди: '+data.queued+' · Проверено: '+data.ready+' · Размеров: '+data.selectedVariants),
   node('p','Публикация: '+(data.published?'открыта':'закрыта')+' · Приём заказов: '+(data.intakeEnabled?'открыт':'закрыт'),'sa-note'),
   node('p','Проверка не размещает товары на сайте. Подтверждение юридических документов, фактических цен и запуска продаж выполняется отдельно.','sa-note'));
  if(!data.entries.length)reviewBody.append(node('p','Очередь пока пуста. Откройте товар, подтвердите готовность и включите его в очередь.','sa-note'));
  const labels={...issueNames,stale:'Требуется повторное подтверждение',selection:'Выбранные размеры изменились',metadata:'Различаются данные вариантов'};
  for(const e of data.entries){
   const row=node('div',undefined,'sa-review-checklist');
   row.append(node('strong','Арт. '+e.sku+' · '+(e.valid?'Готов':'Требует проверки')),node('p','Выбранных размеров: '+e.selected,'sa-note'));
   for(const issue of e.issues)row.append(node('p',labels[issue]||'Проверьте карточку'));
   const button=node('button','Открыть товар','sa-status-save');button.type='button';button.addEventListener('click',()=>{if(!mutationBusy)openReview(e.sku);});row.append(button);reviewBody.append(row);
  }
  reviewStatus.textContent='Проверка завершена. Данные не изменены.';
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось проверить очередь. Повторите проверку.';}
}
$('[data-publication-summary]').addEventListener('click',openPublicationSummary);

async function openReview(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearReview();const current=reviewGeneration,session=marker;$('[data-review-sku]').textContent='Артикул '+sku;
 reviewDialog.showModal();reviewStatus.textContent='Проверяем карточку…';
 try{
  const data=await fetchIndividual(sku,session);
  if(current!==reviewGeneration||session!==marker)return;
  renderReview(data.review,data);reviewStatus.textContent='';
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось проверить карточку. Обновите панель.';}
}
async function saveReview(data,next,selected){
 if(mutationBusy||!marker||!reviewDialog.open||dashboard.hidden)return;
 const current=reviewGeneration,session=marker;mutationBusy=true;reviewStatus.textContent='Сохраняем состояние…';
 try{
  const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({sku:data.sku,expected:data.revision,state:data.state,next,selected}),signal:AbortSignal.timeout(12000)});
  if(current!==reviewGeneration||session!==marker)return;
  if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
  if(!r.ok){reviewStatus.textContent='Изменение отклонено. Закройте и откройте проверку заново.';return;}
  const result=await r.json();if(current!==reviewGeneration||session!==marker)return;
  if(!validReview(result,data.sku))throw Error();
  if(next==='prepare'){if(result.state!=='ready'||result.publicationState!=='prepared')throw Error();}
  else if(next==='cancel'){if(result.publicationState!=='none')throw Error();}
  else if(result.state!==next||result.publicationState!=='none')throw Error();
  if(next==='archived'){catalogDrafts.clear();expandedProducts.add(data.sku);$('[data-catalog-search]').value=data.sku;await select('catalog');}
  if(current===reviewGeneration){const individual=await fetchIndividual(data.sku,session);if(current!==reviewGeneration||session!==marker)return;renderReview(individual.review,individual);reviewStatus.textContent=next==='prepare'?'Товар в очереди.':next==='cancel'?'Товар убран из очереди.':'Состояние сохранено.';}
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить изменение. Откройте проверку заново.';}
 finally{mutationBusy=false;}
}
all('[data-review-close]').forEach(b=>b.addEventListener('click',()=>{if(!mutationBusy)clearReview();}));
reviewDialog.addEventListener('cancel',e=>{e.preventDefault();if(!mutationBusy)clearReview();});
async function openCopy(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearReview();const current=reviewGeneration,session=marker;
 $('[data-review-sku]').textContent='Исходный артикул '+sku;
 reviewDialog.setAttribute('data-copy-mode','');$('#sa-review-title').textContent='Дублировать товар';$('[data-review-intro]').hidden=true;
 reviewDialog.showModal();reviewStatus.textContent='Подбираем свободный артикул…';
 try{
  const [source,suggested]=await Promise.all([fetchIndividual(sku,session),nextSku(session)]);
  if(current!==reviewGeneration||session!==marker)return;
  if(source.intakeEnabled){reviewStatus.textContent='Копирование пока доступно только при закрытом приёме заказов.';return;}
  reviewStatus.textContent='';
  const note=node('p','Описание, характеристики, размеры и цены будут скопированы в новый черновик. Исходный товар не изменится. Проверьте данные перед публикацией.','sa-note');
  const form=node('form',undefined,'sa-copy-form'),label=node('label',undefined,'sa-copy-sku'),input=node('input');input.type='text';input.inputMode='numeric';input.pattern='[0-9]{4}';input.maxLength=4;input.required=true;input.value=suggested;input.id='sa-copy-target';input.autocomplete='off';label.htmlFor=input.id;label.append(node('span','Новый артикул'),input,node('small','Предложен свободный номер. Можно изменить вручную.','sa-note'));
  const photoLabel=node('label',undefined,'sa-copy-photos'),photos=node('input');photos.type='checkbox';photos.id='sa-copy-photos';photos.checked=true;photoLabel.htmlFor=photos.id;photoLabel.append(photos,node('span','Скопировать загруженные фотографии'));
  const hint=node('p','Копируются только фотографии из базы данных. Старые изображения сайта не переносятся.','sa-note');
  const actions=node('div',undefined,'sa-review-actions'),button=node('button','Создать копию','sa-status-save');button.type='submit';actions.append(button);form.append(label,photoLabel,hint,actions);reviewBody.append(note,form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(mutationBusy||current!==reviewGeneration||session!==marker||!form.reportValidity())return;
   const target=input.value.trim();if(target===sku){reviewStatus.textContent='Укажите другой артикул.';return;}
   if(!window.confirm('Создать новый черновик арт. '+target+'?'))return;
   mutationBusy=true;button.disabled=true;input.disabled=photos.disabled=true;reviewStatus.textContent='Копируем товар…';
   try{
    const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({action:'copy',sku,target,expected:source.review.revision,photos:photos.checked}),signal:AbortSignal.timeout(35000)});
    if(current!==reviewGeneration||session!==marker)return;
    if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
    if(!r.ok){reviewStatus.textContent=r.status===409?'Копирование отклонено: артикул занят, карточка изменилась или достигнут лимит. Закройте окно и повторите проверку.':'Не удалось создать копию.';return;}
    const data=await r.json();if(current!==reviewGeneration||session!==marker)return;
    if(data.sku!==target||data.source!==sku||data.state!=='draft')throw Error();
    clearReview();catalogDrafts.clear();expandedProducts.add(target);$('[data-catalog-search]').value=target;await select('catalog');
    for(let page=0;page<20&&session===marker&&tab==='catalog'&&catalogCursor&&!variants.some(v=>v.sku===target);page++){const cursor=catalogCursor;await load(true);if(catalogCursor===cursor)break;}
    if(session===marker&&tab==='catalog')message.textContent='Создан черновик арт. '+target+'. Проверьте данные и фотографии перед публикацией.';
   }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить результат. Проверьте наличие нового артикула перед повтором.';}
   finally{mutationBusy=false;button.disabled=false;input.disabled=photos.disabled=false;}
  });
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подготовить копирование. Обновите панель.';}
}
async function openRemoveSize(item){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearReview();const current=reviewGeneration,session=marker,sku=item.sku;
 reviewDialog.setAttribute('data-copy-mode','');$('#sa-review-title').textContent='Удалить размер';$('[data-review-intro]').hidden=true;$('[data-review-sku]').textContent='Артикул '+sku;
 reviewDialog.showModal();reviewStatus.textContent='Проверяем размер…';
 try{
  const source=await fetchIndividual(sku,session);if(current!==reviewGeneration||session!==marker)return;
  const v=source.review.variants.find(x=>x.id===item.id);
  if(!v){reviewStatus.textContent='Размер уже отсутствует. Обновите каталог.';return;}
  if(source.listed||source.intakeEnabled||source.review.state==='archived'){reviewStatus.textContent='Удаление доступно для черновика при закрытом приёме заказов. Снимите товар с публикации или верните его из архива.';return;}
  if(source.review.variants.length<=1){reviewStatus.textContent='Нельзя удалить последний размер товара. Добавьте другой размер или отправьте товар в архив.';return;}
  reviewStatus.textContent='';
  const summary=node('div',undefined,'sa-remove-summary');summary.append(node('strong',item.title),node('p',v.size),node('strong',money(v.price)));
  if(v.oldPrice)summary.append(node('s',money(v.oldPrice),'sa-old-price'));
  const note=node('p','Размер исчезнет из каталога. История заказов и изменений сохранится. Подтверждение готовности карточки будет сброшено. Остальные размеры не изменятся.','sa-note');
  const actions=node('div',undefined,'sa-review-actions'),cancel=node('button','Отмена'),remove=node('button','Удалить размер','sa-remove-confirm');cancel.type=remove.type='button';cancel.onclick=()=>{if(!mutationBusy)clearReview();};actions.append(cancel,remove);reviewBody.append(summary,note,actions);
  remove.onclick=async()=>{
   if(mutationBusy||current!==reviewGeneration||session!==marker)return;
   mutationBusy=true;remove.disabled=cancel.disabled=true;reviewStatus.textContent='Удаляем размер…';
   try{
    const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({action:'removeSize',sku,id:v.id,expected:source.review.revision}),signal:AbortSignal.timeout(35000)});
    if(current!==reviewGeneration||session!==marker)return;
    if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
    if(!r.ok){reviewStatus.textContent=r.status===409?'Размер не удалён: данные изменились или действует ограничение публикации. Обновите каталог.':'Не удалось удалить размер.';return;}
    const data=await r.json();if(current!==reviewGeneration||session!==marker)return;
    if(data.removed!==v.id||data.sku!==sku||!validReview(data.review,sku)||data.review.state!=='draft'||data.review.variants.some(x=>x.id===v.id))throw Error();
    variants=variants.filter(x=>x.id!==v.id);catalogDrafts.delete(v.id);expandedProducts.add(sku);clearReview();renderCatalog();message.textContent='Размер '+v.size+' удалён. История заказов сохранена.';
   }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить результат. Обновите каталог перед повтором.';}
   finally{mutationBusy=false;remove.disabled=cancel.disabled=false;}
  };
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось проверить размер. Обновите панель.';}
}
async function openPromotion(sku){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 clearReview();const current=reviewGeneration,session=marker;
 reviewDialog.setAttribute('data-copy-mode','');$('#sa-review-title').textContent='Акция и скидка';$('[data-review-intro]').hidden=true;$('[data-review-sku]').textContent='Артикул '+sku;
 reviewDialog.showModal();reviewStatus.textContent='Загружаем цены всех размеров…';
 try{
  const source=await fetchIndividual(sku,session);if(current!==reviewGeneration||session!==marker)return;
  if(source.listed||source.intakeEnabled){reviewStatus.textContent='Для изменения акции снимите товар с публикации и закройте приём заказов.';return;}
  const rows=source.review.variants;
  if(!rows.length||!rows.every(v=>Number.isSafeInteger(v.price)&&v.price>=1&&(!Object.hasOwn(v,'oldPrice')||Number.isSafeInteger(v.oldPrice)&&v.oldPrice>v.price)))throw Error();
  reviewStatus.textContent='';
  const form=node('form',undefined,'sa-bulk-form'),note=node('p','Выберите размеры для акции. Скидка рассчитывается от обычной цены; цены и скидки остальных размеров не изменятся.','sa-note');
  const label=node('label',undefined,'sa-copy-sku'),amount=node('input');amount.type='number';amount.min='0';amount.max='90';amount.step='1';amount.required=true;amount.value='0';label.append(node('span','Скидка, %'),amount,node('small','От 1 до 90%. Значение 0 снимает акцию.','sa-note'));
  const wrap=node('div',undefined,'sa-variant-wrap'),table=node('table',undefined,'sa-bulk-table'),head=node('thead'),tr=node('tr'),body=node('tbody');
  const allCheck=node('input');allCheck.type='checkbox';allCheck.setAttribute('aria-label','Выбрать все размеры');const selectTh=node('th');selectTh.append(allCheck);tr.append(selectTh);for(const title of ['Размер','Обычная цена','Новая цена'])tr.append(node('th',title));head.append(tr);table.append(head,body);wrap.append(table);
  const fields=rows.map(v=>{const line=node('tr'),next=node('td'),check=node('input'),cell=node('td'),size=node('td',v.size);check.type='checkbox';check.setAttribute('aria-label','Выбрать размер '+v.size);cell.append(check);if(v.oldPrice)size.append(node('small','Сейчас: '+money(v.price),'sa-promo-current'));line.append(cell,size,node('td',money(v.oldPrice??v.price)),next);body.append(line);return{v,next,check};});
  const hint=node('p',undefined,'sa-note'),actions=node('div',undefined,'sa-review-actions'),remove=node('button','Снять акцию'),save=node('button','Сохранить акцию','sa-status-save');remove.type='button';save.type='submit';actions.append(remove,save);const selectAll=node('label',undefined,'sa-promo-select-all'),toggle=node('input');toggle.type='checkbox';selectAll.append(toggle,node('span','Выбрать все размеры'));form.append(note,label,selectAll,wrap,hint,actions);reviewBody.append(form);
  function refresh(){
   const p=Number(amount.value);let valid=amount.value!==''&&Number.isInteger(p)&&p>=0&&p<=90;const count=fields.filter(f=>f.check.checked).length;
   for(const {v,next,check} of fields){const base=v.oldPrice??v.price,n=check.checked?Math.round(base*(100-p)/100):v.price,ok=Number.isSafeInteger(n)&&n>=1&&(!check.checked||p===0||n<base);next.textContent=ok?money(n):'Некорректно';next.classList.toggle('sa-bulk-changed',ok&&check.checked&&n!==v.price);if(check.checked)valid=valid&&ok;}
   toggle.checked=allCheck.checked=count===fields.length;toggle.indeterminate=allCheck.indeterminate=count>0&&count<fields.length;
   hint.textContent=!count?'Выберите размеры для изменения.':!valid?'Проверьте процент и минимальную цену.':'Выбрано: '+count+' из '+fields.length+'. '+(p===0?'Будут восстановлены обычные цены выбранных размеров.':'Скидка от обычной цены, без накопления скидок.');
   save.textContent=p===0?'Снять акцию':'Сохранить акцию';save.disabled=!valid||!count||count>100||mutationBusy;
  }
  for(const f of fields)f.check.addEventListener('change',refresh);for(const el of [allCheck,toggle])el.addEventListener('change',()=>{for(const f of fields)f.check.checked=el.checked;refresh();});amount.addEventListener('input',refresh);remove.addEventListener('click',()=>{amount.value='0';refresh();});remove.hidden=!rows.some(v=>v.oldPrice);refresh();
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(mutationBusy||current!==reviewGeneration||session!==marker)return;refresh();if(save.disabled)return;
   const percent=Number(amount.value),selected=fields.filter(f=>f.check.checked).map(f=>f.v.id);if(!window.confirm(percent===0?'Снять акцию у выбранных размеров ('+selected.length+')?':'Применить скидку '+percent+'% к выбранным размерам ('+selected.length+') артикула '+sku+'?'))return;
   mutationBusy=true;amount.disabled=remove.disabled=save.disabled=true;for(const el of [allCheck,toggle,...fields.map(f=>f.check)])el.disabled=true;reviewStatus.textContent='Сохраняем…';
   try{
    const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({action:'promotion',sku,expected:source.review.revision,percent,selected}),signal:AbortSignal.timeout(35000)});
    if(current!==reviewGeneration||session!==marker)return;
    if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
    if(!r.ok){reviewStatus.textContent=r.status===409?'Акция не сохранена: данные изменились или товар опубликован. Обновите каталог.':'Не удалось сохранить акцию.';return;}
    const result=await r.json();if(current!==reviewGeneration||session!==marker)return;if(!validReview(result,sku))throw Error();
    for(const item of result.variants){const v=variants.find(x=>x.id===item.id);if(v){delete v.oldPrice;Object.assign(v,item);if(selected.includes(item.id))catalogDrafts.delete(v.id);}}
    clearReview();renderCatalog();message.textContent=percent===0?'Акция снята. Обычные цены восстановлены.':'Акция сохранена. Проверьте готовность карточки к публикации.';
   }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить результат. Обновите каталог перед повтором.';}
   finally{mutationBusy=false;amount.disabled=remove.disabled=false;for(const el of [allCheck,toggle,...fields.map(f=>f.check)])el.disabled=false;if(current===reviewGeneration)refresh();}
  });
 }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось загрузить цены. Обновите панель.';}
}
function openBulkPrices(sku=null,manual=false){
 if(mutationBusy||!marker||dashboard.hidden||tab!=='catalog')return;
 const q=$('[data-catalog-search]').value.trim().toLowerCase();
 const rows=variants.filter(v=>!v.oldPrice&&(manual?catalogDrafts.has(v.id)&&catalogDrafts.get(v.id).price!==String(v.price):sku?v.sku===sku:[v.sku,v.title,v.finish,v.size].join(' ').toLowerCase().includes(q)));
 if(!rows.length){message.textContent=manual?'Нет изменённых цен.':'Нет загруженных вариантов для изменения.';return;}
 clearReview();const current=reviewGeneration,session=marker;
 reviewDialog.setAttribute('data-copy-mode','');$('#sa-review-title').textContent=manual?'Сохранить изменённые цены':'Массовое изменение цен';$('[data-review-intro]').hidden=true;
 $('[data-review-sku]').textContent=sku?'Артикул '+sku:'Загруженные варианты';
 reviewDialog.showModal();
 const form=node('form',undefined,'sa-bulk-form'),note=node('p',manual?'Сохраняются только цены. Изменения доступности не затрагиваются.':'Выберите варианты, способ изменения и проверьте новые цены. Расчёт выполняется от сохранённых цен. Размеры с акцией исключены.','sa-note');
 const scope=node('p','Вариантов в списке: '+rows.length+(catalogCursor?' · Каталог загружен частично.':'')+' · До 50 изменений за одну операцию.','sa-note');
 const controls=node('div',undefined,'sa-bulk-controls'),type=node('select'),amount=node('input');type.setAttribute('aria-label','Способ изменения');for(const [value,label] of [['percent','Изменить на %'],['rub','Изменить на ₽'],['manual','Введённые цены']]){const opt=node('option',label);opt.value=value;type.append(opt);}
 type.value=manual?'manual':'percent';type.disabled=manual;amount.type='number';amount.step='any';amount.value='10';amount.setAttribute('aria-label','Величина изменения');amount.placeholder='Например, -10';controls.append(type,amount);
 const wrap=node('div',undefined,'sa-variant-wrap'),table=node('table',undefined,'sa-bulk-table'),head=node('thead'),tr=node('tr'),body=node('tbody');
 const allCheck=node('input');allCheck.type='checkbox';allCheck.checked=true;allCheck.setAttribute('aria-label','Выбрать все варианты');const th=node('th');th.append(allCheck);tr.append(th);for(const title of ['Товар / размер','Было','Будет'])tr.append(node('th',title));head.append(tr);table.append(head,body);wrap.append(table);
 const fields=rows.map(v=>{const line=node('tr'),check=node('input'),cell=node('td'),next=node('td'),label=node('td');check.type='checkbox';check.checked=true;check.setAttribute('aria-label','Выбрать '+v.sku+' '+v.size);cell.append(check);label.append(node('strong','Арт. '+v.sku+' · '+v.size),node('p',v.title,'sa-note'));line.append(cell,label,node('td',money(v.price)),next);body.append(line);return{v,check,next};});
 const status=node('p',undefined,'sa-note'),actions=node('div',undefined,'sa-review-actions'),save=node('button','Сохранить цены','sa-status-save');save.type='submit';actions.append(save);form.append(note,scope,controls,wrap,status,actions);reviewBody.append(form);
 let items=[];
 function refresh(){
  amount.hidden=type.value==='manual';items=[];let bad=0,selected=0;
  const n=Number(amount.value);
  for(const f of fields){
   const {v,check,next}=f;let p=type.value==='manual'?Number(catalogDrafts.get(v.id)?.price??v.price):type.value==='percent'?Math.round(v.price*(1+n/100)):Math.round(v.price+n);
   const valid=(type.value==='manual'||amount.value.trim()!=='')&&Number.isSafeInteger(p)&&p>=1&&p<=100000000;
   next.textContent=valid?money(p):'Некорректно';next.classList.toggle('sa-bulk-changed',valid&&p!==v.price&&check.checked);
   if(check.checked){selected++;if(!valid)bad++;else if(p!==v.price)items.push({id:v.id,expectedPrice:v.price,price:p});}
  }
  allCheck.checked=selected===fields.length;allCheck.indeterminate=selected>0&&selected<fields.length;
  status.textContent=bad?'Проверьте новые цены: '+bad+' некорректных.':items.length>50?'Выберите не более 50 изменяемых вариантов.':'Изменится цен: '+items.length+'.';
  save.disabled=bad>0||items.length===0||items.length>50||mutationBusy;
 }
 type.addEventListener('change',refresh);amount.addEventListener('input',refresh);for(const f of fields)f.check.addEventListener('change',refresh);
 allCheck.addEventListener('change',()=>{for(const f of fields)f.check.checked=allCheck.checked;refresh();});refresh();
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(mutationBusy||current!==reviewGeneration||session!==marker)return;
  refresh();if(save.disabled)return;
  const submitted=items.map(x=>({...x}));if(!window.confirm('Сохранить изменения '+submitted.length+' цен?'))return;
  mutationBusy=true;save.disabled=true;reviewStatus.textContent='Сохраняем цены…';
  const controlsToDisable=[type,amount,allCheck,...fields.map(f=>f.check)];for(const el of controlsToDisable)el.disabled=true;
  try{
   const r=await fetch('/api/admin/catalog/review/edit',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','X-Session-Marker':session},body:JSON.stringify({action:'prices',items:submitted}),signal:AbortSignal.timeout(35000)});
   if(current!==reviewGeneration||session!==marker)return;
   if(r.status===401||r.status===403){deny('Доступ закрыт. Войдите заново.',true);return;}
   if(!r.ok){reviewStatus.textContent=r.status===409?'Ни одна цена не сохранена: данные изменились, товар опубликован или приём заказов открыт. Обновите каталог.':'Не удалось сохранить цены.';return;}
   const data=await r.json();if(current!==reviewGeneration||session!==marker)return;
   const expected=new Map(submitted.map(x=>[x.id,x.price]));if(!Array.isArray(data.variants)||data.variants.length!==expected.size||new Set(data.variants.map(x=>x.id)).size!==expected.size||!data.variants.every(x=>expected.get(x.id)===x.price&&typeof x.active==='boolean'))throw Error();
   for(const update of data.variants){const v=variants.find(x=>x.id===update.id);if(v){const draft=catalogDrafts.get(v.id);Object.assign(v,update);if(draft&&draft.active!==v.active)catalogDrafts.set(v.id,{price:String(v.price),active:draft.active});else catalogDrafts.delete(v.id);}}
   clearReview();renderCatalog();message.textContent='Сохранено цен: '+submitted.length+'.';
  }catch{if(current===reviewGeneration)reviewStatus.textContent='Не удалось подтвердить результат. Обновите каталог перед повтором.';}
  finally{mutationBusy=false;for(const el of controlsToDisable)el.disabled=false;type.disabled=manual;if(current===reviewGeneration)refresh();}
 });
}
$('[data-bulk-prices]').addEventListener('click',()=>openBulkPrices());
$('[data-save-prices]').addEventListener('click',()=>openBulkPrices(null,true));
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
   price.type='number';price.min='1';price.max='100000000';price.step='1';price.value=draft?.price??String(item.price);price.className='sa-price-input';price.setAttribute('aria-label','Цена '+item.sku+' '+item.size);priceCell.append(price);if(item.oldPrice){price.readOnly=true;priceCell.append(node('s',money(item.oldPrice),'sa-old-price'));priceCell.append(node('small','Акция','sa-note'));}
   const activeCell=node('td'),label=node('label',undefined,'sa-active-toggle'),active=node('input');active.type='checkbox';active.checked=draft?.active??item.active;active.disabled=item.storefrontReady!==true;label.append(active,node('span',item.storefrontReady!==true?'Черновик':active.checked?'Активен':'Неактивен'));activeCell.append(label);
   const action=node('td'),save=node('button','Сохранить','sa-status-save');save.type='button';
   function changed(){
    label.lastChild.textContent=item.storefrontReady!==true?'Черновик':active.checked?'Активен':'Неактивен';
    const dirty=price.value!==String(item.price)||active.checked!==item.active;
    if(dirty)catalogDrafts.set(item.id,{price:price.value,active:active.checked});else catalogDrafts.delete(item.id);
    save.disabled=!price.checkValidity()||price.value===''||!dirty;
   }
   price.addEventListener('input',changed);active.addEventListener('change',changed);
   save.addEventListener('click',()=>editVariant(item,Number(price.value),active.checked,save));const controls=node('div',undefined,'sa-variant-actions'),remove=node('button','Удалить','sa-remove-size');remove.type='button';remove.setAttribute('aria-label','Удалить размер '+item.size+' артикула '+item.sku);remove.disabled=rows.length<=1&&!catalogCursor;if(remove.disabled)remove.title='Нельзя удалить последний размер';remove.addEventListener('click',()=>openRemoveSize(item));controls.append(save,remove);action.append(controls);
   tr.append(node('td',item.size),priceCell,activeCell,action);tbody.append(tr);changed();
  }
  card.append(tableWrap);
  const addRow=node('div',undefined,'sa-catalog-add-row'),addSize=node('button','+ Добавить размер');addSize.type='button';addSize.addEventListener('click',()=>openCreate(sku));const gallery=node('button','Фотографии');gallery.type='button';gallery.addEventListener('click',()=>openPhotos(sku));const edit=node('button','Редактировать карточку');edit.type='button';edit.addEventListener('click',()=>openDetails(sku));const preview=node('button','Предпросмотр');preview.type='button';preview.addEventListener('click',()=>openPreview(sku));const review=node('button','Готовность и публикация');review.type='button';review.addEventListener('click',()=>openReview(sku));const copy=node('button','Дублировать товар');copy.type='button';copy.addEventListener('click',()=>openCopy(sku));const bulk=node('button','Изменить цены');bulk.type='button';bulk.addEventListener('click',()=>openBulkPrices(sku));const promo=node('button','Акция / скидка');promo.type='button';promo.addEventListener('click',()=>openPromotion(sku));addRow.append(preview,edit,gallery,addSize,review,copy,bulk,promo);card.append(addRow);target.append(card);
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
   if(!list.every(v=>v&&typeof v.sku==='string'&&typeof v.title==='string'&&Number.isSafeInteger(v.price)&&typeof v.active==='boolean'&&typeof v.storefrontReady==='boolean'))throw Error();
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
