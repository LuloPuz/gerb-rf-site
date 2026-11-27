import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const model=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../catalog-pricing.js',import.meta.url))).toString('base64'));
const v={sku:'1019',size:'10 × 20 см',price:1500,title:'Тест',finish:'Барельеф',url:'product-1019.html',image:'',dynamicImageId:'12345678-1234-4234-8234-123456789abc'};
const payload={published:true,intakeEnabled:false,variants:[v]};
test('dynamic cart resolves public product URL and main photo',()=>{
 const s=model.parseCatalog(payload),row=s.byKey.get(model.variantKey('1019','10×20 см'));
 assert.equal(row.url,'product.html?sku=1019');assert.equal(row.image,'/api/catalog/photo?id='+v.dynamicImageId);
 assert.equal(row.price,1500);assert.equal(s.intakeEnabled,false);
 const result=model.compareCart([{sku:v.sku,size:v.size,price:1000,qty:2}],s);
 assert.deepEqual(result.changed,[0]);assert.equal(result.updated[0].price,1500);assert.equal(result.updated[0].qty,2);assert.equal(result.updated[0].url,row.url);
});
test('closed publication, invalid dynamic photo and missing variants',()=>{
 assert.throws(()=>model.parseCatalog({...payload,published:false}));
 assert.throws(()=>model.parseCatalog({...payload,variants:[{...v,dynamicImageId:'../x'}]}));
 assert.deepEqual(model.compareCart([v],model.parseCatalog({published:false,intakeEnabled:false,variants:[]})).missing,[0]);
});
