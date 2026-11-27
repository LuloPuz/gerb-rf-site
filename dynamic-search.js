// Public product search: only accept the explicitly published product list.
const skuOK=s=>typeof s==='string'&&/^[0-9]{4}$/.test(s);
const uuidOK=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
export const categoryNames={rf:'Гербы РФ',region:'Гербы субъектов РФ',city:'Гербы городов РФ',department:'Эмблемы ведомств'};
export function productKeys(p){
 const aliases=p.category==='rf'?'герб россии российской федерации рф двуглавый орел':p.category==='city'&&/москв/i.test(p.title)?'герб москвы москва мск московский':'';
 return [p.title,p.finish,categoryNames[p.category],aliases,p.sku,'арт','артикул'].join(' ');
}
export function publicSearchPages(data){
 if(!data||typeof data.published!=='boolean'||!Array.isArray(data.products)||(!data.published&&data.products.length))throw Error('Invalid public list');
 const seen=new Set();
 const pages=data.products.map(p=>{
  if(!p||!skuOK(p.sku)||seen.has(p.sku)||typeof p.title!=='string'||!p.title||typeof p.finish!=='string'||!Object.hasOwn(categoryNames,p.category)||!uuidOK(p.imageId)||!Number.isSafeInteger(p.priceFrom)||p.priceFrom<1||p.priceFrom>100000000)throw Error('Invalid public product');
  seen.add(p.sku);
  return {title:p.title,meta:[p.finish,'арт. '+p.sku].filter(Boolean).join(' · '),keys:productKeys(p),url:'product.html?sku='+p.sku,photo:'/api/catalog/photo?id='+p.imageId,dynamic:true};
 });
 return {published:data.published,pages};
}
export function mergeSearchPages(base,skuByUrl,snapshot){
 if(!snapshot.published)return base.slice();
 // After cutover the old product pages are not a source of available merchandise.
 // Keep the category and request-only reference directory entries.
 return [...snapshot.pages,...base.filter(p=>!Object.hasOwn(skuByUrl,p.url.split(/[?#]/)[0]))];
}
