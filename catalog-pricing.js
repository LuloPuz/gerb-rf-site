// Pure storefront catalog model. Only a published server response is authoritative.
export function canonicalSize(value){
 const m=String(value||'').trim().match(/^([0-9]{1,5}(?:[,.][0-9]{1,2})?)\s*[×хx]\s*([0-9]{1,5}(?:[,.][0-9]{1,2})?)\s*см$/iu);
 return m?m[1].replace('.',',')+' × '+m[2].replace('.',',')+' см':'';
}
export const variantKey=(sku,size)=>String(sku)+'|'+canonicalSize(size);
export function parseCatalog(p){
 if(!p||typeof p.published!=='boolean'||typeof p.intakeEnabled!=='boolean'||!Array.isArray(p.variants)||p.variants.length>2000||
    (!p.published&&(p.intakeEnabled||p.variants.length)))throw Error('Invalid catalog policy');
 const byKey=new Map(),bySku=new Map();
 for(const v of p.variants){
  if(!v||typeof v.sku!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(v.sku)||typeof v.size!=='string'||canonicalSize(v.size)!==v.size||
     !Number.isSafeInteger(v.price)||v.price<1||v.price>100000000||
     (Object.hasOwn(v,'oldPrice')&&(!Number.isSafeInteger(v.oldPrice)||v.oldPrice<=v.price||v.oldPrice>100000000))||
     typeof v.title!=='string'||!v.title||typeof v.finish!=='string'||typeof v.url!=='string'||!/^[a-z0-9-]+\.html$/.test(v.url)||
     typeof v.image!=='string'||v.image.length>300)throw Error('Invalid catalog variant');
  let resolved=v;
  if(Object.hasOwn(v,'dynamicImageId')){
   if(!/^[0-9]{4}$/.test(v.sku)||typeof v.dynamicImageId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v.dynamicImageId))throw Error('Invalid dynamic image');
   resolved={...v,url:'product.html?sku='+encodeURIComponent(v.sku),image:'/api/catalog/photo?id='+encodeURIComponent(v.dynamicImageId)};
  }
  const key=variantKey(v.sku,v.size);if(byKey.has(key))throw Error('Duplicate variant');
  byKey.set(key,resolved);if(!bySku.has(v.sku))bySku.set(v.sku,[]);bySku.get(v.sku).push(resolved);
 }
 return {published:p.published,intakeEnabled:p.intakeEnabled,byKey,bySku};
}
export function compareCart(items,snapshot){
 const missing=[],changed=[],updated=[];
 for(let i=0;i<items.length;i++){
  const item=items[i],v=snapshot.byKey.get(variantKey(item.sku,item.size));
  if(!v){missing.push(i);updated.push(item);continue;}
  if(Number(item.price)!==v.price)changed.push(i);
  updated.push({...item,price:v.price,title:v.title,finish:v.finish,size:v.size,image:v.image,url:v.url});
 }
 return {missing,changed,updated};
}
