// Read-only authenticated preview. Never enables publication, intake or cart writes.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const skuOK=s=>typeof s==='string'&&/^[0-9]{4}$/.test(s);
export const adminPreview=location.origin==='https://gerbrf.ru'&&new URLSearchParams(location.search).get('preview')==='admin';
async function get(path,marker){
 const headers={Accept:'application/json'};if(marker)headers['X-Session-Marker']=marker;
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',headers,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Preview unavailable');return r.json();
}
async function session(){
 const r=await get('/api/admin/session');
 if(r.authorized!==true||! /^[0-9a-f]{64}$/.test(r.sessionMarker))throw Error('Administrator required');
 return r.sessionMarker;
}
export function adminPhoto(id,alt){
 if(typeof id!=='string'||!uuid.test(id))throw Error('Invalid photo');
 const im=document.createElement('img');im.src='/api/admin/catalog/photo?id='+encodeURIComponent(id);im.alt=alt;im.decoding='async';return im;
}
export async function previewProducts(){
 const marker=await session(),groups=new Map();let offset=0;
 const filters={q:'',category:'',status:'',sale:'',sort:'position',featured:false,noPhotos:false};
 for(let page=0;page<100;page++){
  const r=await get('/api/admin/catalog/review?'+new URLSearchParams({browse:'1',filters:JSON.stringify(filters),offset:String(offset)}),marker);
  if(!Array.isArray(r.variants)||!(r.nextOffset===null||Number.isSafeInteger(r.nextOffset)&&r.nextOffset>offset))throw Error('Invalid preview page');
  for(const v of r.variants){
   if(v.status==='archived')continue;
   if(!skuOK(v.sku)||!uuid.test(v.photoId)||!['rf','region','city','department'].includes(v.category)||typeof v.title!=='string'||typeof v.finish!=='string'||typeof v.size!=='string'||!Number.isSafeInteger(v.price)||v.price<1)throw Error('Incomplete preview card: '+v.sku);
   if(!groups.has(v.sku))groups.set(v.sku,{sku:v.sku,title:v.title,finish:v.finish,category:v.category,imageId:v.photoId,featured:v.featured,position:v.position,variants:[]});
   groups.get(v.sku).variants.push(v);
  }
  if(r.nextOffset===null)return {published:true,products:[...groups.values()].map(p=>({...p,priceFrom:Math.min(...p.variants.map(v=>v.price))}))};
  offset=r.nextOffset;
 }
 throw Error('Preview limit');
}
export async function previewProduct(sku){
 if(!skuOK(sku))throw Error('Invalid SKU');
 const marker=await session(),p=await get('/api/admin/catalog/preview?sku='+sku,marker);
 if(p.sku!==sku||!p.fields||!Array.isArray(p.variants)||!p.variants.length||!Array.isArray(p.photos)||!p.photos.length||!p.photos.every(x=>uuid.test(x.id)))throw Error('Incomplete product');
 return {sku,...p.fields,variants:p.variants,photos:p.photos};
}
export function addPreviewNotice(target){
 const el=document.createElement('p');el.className='ds-layout-note';el.setAttribute('role','status');el.style.cssText='padding:10px 14px;border:1px solid #d8d0bf;background:#fff;font-size:13px;margin:10px 0;';
 el.textContent='Закрытый предпросмотр · реальные данные из админки · покупка отключена. ';
 const a=document.createElement('a');const u=new URL(location.href);u.searchParams.delete('preview');a.href=u.pathname+u.search;a.textContent='Обычная версия';el.append(a);target.before(el);
}
