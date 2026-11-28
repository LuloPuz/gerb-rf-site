// Explicit release switch. Keep false until real catalog has been approved.
// This is a frontend routing switch, not authorization to publish or accept orders.
(()=> {
 const enabled=true;
 window.derzhavaStorefrontMode=enabled?'dynamic':'legacy';
 if(!enabled||location.origin!=='https://gerbrf.ru')return;
 document.documentElement.dataset.storefrontMode='dynamic';
 const skuByPath={
  "gerb-moskvy-bez-shchita-kraska.html": "1001",
  "gerb-moskvy-bez-shchita-metallizaciya.html": "1002",
  "gerb-moskvy-na-shchite-kraska-plastik.html": "1003",
  "gerb-moskvy-na-shchite-kraska-barhat.html": "1004",
  "gerb-moskvy-na-shchite-kraska-metall.html": "1005",
  "gerb-moskvy-na-shchite-metallizaciya-plastik.html": "1006",
  "gerb-moskvy-na-shchite-metallizaciya-barhat.html": "1007",
  "gerb-moskvy-na-shchite-metallizaciya-metall.html": "1008",
  "gerb-rf-barelef-kraska.html": "1009",
  "gerb-rf-barelef-metallizaciya.html": "1010",
  "gerb-rf-gorelef.html": "1011",
  "gerb-rf-na-shchite-barelef-kraska-plastik.html": "1012",
  "gerb-rf-na-shchite-barelef-kraska-barhat.html": "1013",
  "gerb-rf-na-shchite-barelef-kraska-metall.html": "1014",
  "gerb-rf-na-shchite-barelef-metallizaciya-plastik.html": "1015",
  "gerb-rf-na-shchite-barelef-metallizaciya-barhat.html": "1016",
  "gerb-rf-na-shchite-barelef-metallizaciya-metall.html": "1017",
  "gerb-rf-na-shchite-gorelef.html": "1018"
};
 const groups={
 'gerb-rf.html':'герб России',
 'gerb-rf-bez-shchita.html':'герб России без щита',
 'gerb-rf-barelef.html':'герб России без щита барельеф',
 'gerb-rf-na-shchite.html':'герб России на щите',
 'gerb-rf-na-shchite-barelef.html':'герб России на щите барельеф',
 'gerb-rf-na-shchite-barelef-kraska.html':'герб России на щите краска',
 'gerb-rf-na-shchite-barelef-metallizaciya.html':'герб России на щите металлизация',
 'gerb-moskvy.html':'герб Москвы',
 'gerb-moskvy-bez-shchita.html':'герб Москвы без щита',
 'gerb-moskvy-na-shchite.html':'герб Москвы на щите',
 'gerb-moskvy-na-shchite-kraska.html':'герб Москвы на щите краска',
 'gerb-moskvy-na-shchite-metallizaciya.html':'герб Москвы на щите металлизация'
 };
 const path=location.pathname.split('/').pop();
 if(Object.hasOwn(skuByPath,path)){location.replace('/product.html?sku='+skuByPath[path]);return;}
 if(Object.hasOwn(groups,path)){location.replace('/catalog.html?q='+encodeURIComponent(groups[path]));}
})();
