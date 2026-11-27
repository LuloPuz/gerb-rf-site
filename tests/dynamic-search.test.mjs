import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const m=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../dynamic-search.js',import.meta.url))).toString('base64'));
const legacy=[{url:'old.html',title:'old'},{url:'directory.html?q=x',title:'directory'}],map={'old.html':'1001'};
const item={sku:'1001',title:'Герб Москвы',finish:'Барельеф',category:'city',priceFrom:1000,imageId:'12345678-1234-4234-8234-123456789abc'};
test('closed publication keeps existing search; approved data replaces old product links',()=>{
 assert.deepEqual(m.mergeSearchPages(legacy,map,m.publicSearchPages({published:false,products:[]})),legacy);
 const result=m.mergeSearchPages(legacy,map,m.publicSearchPages({published:true,products:[item]}));
 assert.equal(result[0].url,'product.html?sku=1001');assert.equal(result[0].photo,'/api/catalog/photo?id='+item.imageId);
 assert.equal(result[1],legacy[1]);assert.equal(result.length,2);
 assert.match(result[0].keys,/москва/);assert.match(result[0].keys,/1001/);
});
test('rejects unpublished products, duplicate SKU and unsafe photo IDs',()=>{
 assert.throws(()=>m.publicSearchPages({published:false,products:[item]}));
 assert.throws(()=>m.publicSearchPages({published:true,products:[item,item]}));
 assert.throws(()=>m.publicSearchPages({published:true,products:[{...item,imageId:'../bad'}]}));
});
