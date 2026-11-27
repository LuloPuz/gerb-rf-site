import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
async function load(file){return 'data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../'+file,import.meta.url))).toString('base64');}
let src=await readFile(new URL('../storefront-cards.js',import.meta.url),'utf8');
src=src.replace('./dynamic-search.js?v=20261128-search1',await load('dynamic-search.js')).replace('./catalog-pricing.js?v=20261128-cart2',await load('catalog-pricing.js')).replace("const layoutCheck=new URLSearchParams(location.search).get('layout')==='check';",'const layoutCheck=false;');
const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const p={sku:'1001',title:'Герб Москвы',finish:'Покрытие краской · Барельеф · Без щита',category:'city',priceFrom:1000,imageId:'12345678-1234-4234-8234-123456789abc'};
const v={sku:p.sku,title:p.title,finish:p.finish,size:'10 × 20 см',price:1000,url:'product-1001.html',image:'',dynamicImageId:p.imageId};
test('closed policy preserves static storefront',()=>assert.deepEqual(m.projectProducts({published:false,products:[]},{published:false,intakeEnabled:false,variants:[]}),{published:false,products:[]}));
test('published cards share validated variants, reject inconsistent photos or prices',()=>{
 const products={published:true,products:[p]},variants={published:true,intakeEnabled:false,variants:[v]};
 assert.equal(m.projectProducts(products,variants).products[0].variants[0].price,1000);
 assert.throws(()=>m.projectProducts(products,{...variants,variants:[{...v,price:1001}]}));
 assert.throws(()=>m.projectProducts(products,{...variants,variants:[{...v,dynamicImageId:'12345678-1234-4234-8234-123456789abd'}]}));
});
test('known finish labels map to existing table without invented material',()=>{
 assert.deepEqual(m.finishFields(p.finish),[['Покрытие','Покрытие краской'],['Рельеф','Барельеф'],['Исполнение','Без щита'],['Материал щита','—']]);
 assert.deepEqual(m.finishFields('Авторская отделка'),[['Исполнение','Авторская отделка']]);
});
