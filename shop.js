
(() => {
  if(window.__derzhavaShopInit) return;
  window.__derzhavaShopInit=true;
  const CART_KEY='derzhava_cart_v1';
  const money=n=>new Intl.NumberFormat('ru-RU').format(Number(n)||0)+' ₽';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const cart=()=>{const items=read(CART_KEY,[]);return Array.isArray(items)?items:[];};
  const cartCount=()=>cart().reduce((sum,item)=>sum+(Number(item.qty)||1),0);
  const cartTotal=()=>cart().reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||1),0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let busy=false,fillGeneration=0;
  let catalogModel=null,catalogSnapshot=null,catalogState='pending',catalogGeneration=0,catalogPromise=null;
  const originalPricing=new WeakMap();
  const canonical=location.origin==='https://gerbrf.ru';
  function normalizePhone(value){
    const raw=String(value||'').trim();
    if(!/^\+?[0-9 ()-]+$/.test(raw))return '';
    let digits=raw.replace(/\D/g,'');
    if(digits.length===10&&!raw.startsWith('+'))digits='7'+digits;
    if(digits.length===11&&digits.startsWith('8')&&!raw.startsWith('+'))digits='7'+digits.slice(1);
    return '+'+digits;
  }
  function canonicalSize(value){
    const m=String(value||'').trim().match(/^([0-9]{1,5}(?:[,.][0-9]{1,2})?)\s*[×хx]\s*([0-9]{1,5}(?:[,.][0-9]{1,2})?)\s*см$/iu);
    return m?m[1].replace('.',',')+' × '+m[2].replace('.',',')+' см':'';
  }
  function safePath(value,product=false){
    try{const u=new URL(String(value||''),location.href);
      if(u.origin!==location.origin||!/^https?:$/.test(u.protocol))return product?'catalog.html':'';
      if(product&&!/\/[a-z0-9-]+\.html$/.test(u.pathname))return 'catalog.html';
      return u.pathname+u.search;
    }catch{return product?'catalog.html':'';}
  }
  function toast(html,cartLink=false){
    let el=document.querySelector('.shop-toast');
    if(!el){el=document.createElement('div');el.className='shop-toast';el.setAttribute('role','status');document.body.appendChild(el)}
    clearTimeout(toast.t);
    el.classList.toggle('shop-toast-cart',cartLink);
    el.innerHTML=cartLink
      ? '<a class="shop-toast-link" href="cart.html">'+html+'<span class="shop-toast-action">Перейти в корзину <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a>'
      : html;
    el.classList.add('show');
    const link=el.querySelector('.shop-toast-link');
    const hide=()=>{el.classList.remove('show');if(link)link.tabIndex=-1;};
    const schedule=()=>{clearTimeout(toast.t);toast.t=setTimeout(hide,cartLink?5000:2600);};
    el.onmouseenter=()=>{if(cartLink)clearTimeout(toast.t);};
    el.onmouseleave=()=>{if(cartLink&&!el.contains(document.activeElement))schedule();};
    el.onfocusin=()=>{if(cartLink)clearTimeout(toast.t);};
    el.onfocusout=()=>{if(cartLink&&!el.matches(':hover'))schedule();};
    schedule();
  }

  function updateHeaderCount(){
    const n=cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(el=>{
      el.textContent=n;
      el.dataset.empty=String(n===0);
    });
    document.querySelectorAll('[data-cart-link]').forEach(link=>{
      link.classList.toggle('has-items',n>0);
      link.setAttribute('aria-label',n>0?'Корзина, товаров: '+n:'Корзина');
      link.setAttribute('title',n>0?'Корзина · '+n:'Корзина');
    });
  }

  function injectHeader(){
    document.querySelectorAll('.header-inner').forEach(header=>{
      if(header.querySelector('.shop-header-actions')) return;
      const actions=document.createElement('div');
      actions.className='shop-header-actions';
      actions.innerHTML=
        '<a class="shop-header-link shop-account-link" href="account.html" aria-label="Личный кабинет" title="Личный кабинет">'+
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"></path></svg>'+
          '<span class="shop-header-label">Кабинет</span>'+
        '</a>'+
        '<a class="shop-header-link shop-cart-link" data-cart-link href="cart.html" aria-label="Корзина" title="Корзина">'+
          '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 8H6.2"></path><circle cx="10" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle></svg>'+
          '<span class="shop-header-label">Корзина</span>'+
          '<span class="shop-cart-count" data-cart-count data-empty="true">0</span>'+
        '</a>';
      header.appendChild(actions);
    });
    updateHeaderCount();
  }

  function currentProduct(){
    const info=document.querySelector('.final-product-info');
    if(!info) return null;
    const active=document.querySelector('.size-option.active');
    const priceEl=document.getElementById('productPrice')||info.querySelector('.final-price');
    const price=Number(active?.dataset.price)||Number(String(priceEl?.textContent||'').replace(/\D/g,''))||0;
    const size=active?.dataset.size||active?.textContent?.trim()||'Стандартный размер';
    const title=info.querySelector('h1')?.textContent?.trim()||document.title;
    const finish=info.querySelector('.final-finish')?.textContent?.trim()||'';
    const sku=(info.querySelector('.product-article')?.textContent||'').replace(/[^0-9]/g,'').slice(0,4);
    const image=document.querySelector('[data-gallery-main]')?.getAttribute('src')||document.querySelector('.final-product-main img')?.getAttribute('src')||'';
    const url=location.pathname.split('/').pop()+location.search;
    return {id:url+'|'+size,title,finish,sku,size,price,image,url,qty:1};
  }

  function addProduct(item){
    if(canonical&&catalogState!=='draft'&&catalogState!=='published'){toast('Не удалось проверить актуальность цены. Обновите страницу.');return false;}
    if(catalogState==='published'){
      const v=catalogSnapshot.byKey.get(catalogModel.variantKey(item.sku,item.size));
      if(!v){toast('Этот размер сейчас недоступен.');return false;}
      item={...item,price:v.price,title:v.title,finish:v.finish,size:v.size,url:v.url,image:v.image};
    }
    const items=cart();
    const existing=items.find(x=>x.sku===item.sku&&canonicalSize(x.size)===canonicalSize(item.size));
    if(existing) existing.qty=Math.min(100,(Number(existing.qty)||1)+1); else items.push(item);
    write(CART_KEY,items);updateHeaderCount();
    document.querySelectorAll('[data-cart-link]').forEach(link=>{
      link.classList.remove('cart-attention');
      void link.offsetWidth;
      link.classList.add('cart-attention');
      setTimeout(()=>link.classList.remove('cart-attention'),900);
    });
    toast('<strong>Добавлено в корзину</strong><br>'+esc(item.title)+' · '+esc(item.size),true);
    document.dispatchEvent(new CustomEvent('derzhava:cartchange'));
    return true;
  }

  function initProductPage(){
    const info=document.querySelector('.final-product-info');
    const direct=document.querySelector('.final-order-button');
    if(!info||!direct||info.querySelector('.shop-product-actions')) return;

    const actions=document.createElement('div');
    actions.className='shop-product-actions';
    actions.innerHTML='<button class="shop-add-button" type="button">Добавить в корзину</button><a class="shop-go-cart" href="cart.html">Корзина</a>';
    direct.parentNode.insertBefore(actions,direct);
    direct.classList.add('shop-direct-order');
    direct.textContent='← Продолжить покупки';
    direct.setAttribute('href','catalog.html#popular');
    direct.removeAttribute('target');
    direct.addEventListener('click',event=>{
      const ref=document.referrer||'';
      if(ref.includes('/catalog.html')){
        event.preventDefault();
        history.back();
      }
    });

    const add=actions.querySelector('.shop-add-button');
    add.addEventListener('click',()=>{
      const item=currentProduct();if(!item) return;
      if(!addProduct(item))return;
      add.classList.add('is-added');add.textContent='Добавлено ✓';
      setTimeout(()=>{add.classList.remove('is-added');add.textContent='Добавить в корзину'},1500);
    });
  }

  function popularCardItem(card,allowUnpriced=false){
    if(!card) return null;
    const active=card.querySelector('[data-card-size].active')||card.querySelector('[data-card-size]');
    const price=Number(active?.dataset.price)||Number(String(card.querySelector('.popular-card-price')?.textContent||'').replace(/\D/g,''))||0;
    const sizeValue=active?.querySelector('span')?.textContent?.trim()||active?.textContent?.trim()||'Стандартный размер';
    const sizeUnit=active?.querySelector('small')?.textContent?.trim()||'';
    const size=[sizeValue,sizeUnit].filter(Boolean).join(' ');
    const title=card.querySelector('.popular-title-block h3, h3')?.textContent?.trim()||'Товар';
    const sku=(card.querySelector('.popular-card-sku')?.textContent||'').replace(/[^0-9]/g,'').slice(0,4);
    const chips=[...card.querySelectorAll('.popular-chip')].map(el=>el.textContent.trim()).filter(Boolean);
    const finish=chips.join(' · ');
    const photo=card.querySelector('.popular-media img');
    const image=photo?.dataset.originalSrc||photo?.getAttribute('src')||'';
    const link=card.querySelector('.popular-card-cta')||card.querySelector('.popular-hit');
    const url=link?.getAttribute('href')||'catalog.html';
    if(!price&&!allowUnpriced) return null;
    return {id:url+'|'+size,title,finish,sku,size,price,image,url,qty:1};
  }

  function initCatalogQuickAdd(){
    document.querySelectorAll('.popular-card[data-product-card]').forEach(card=>{
      const bottom=card.querySelector('.popular-card-bottom');
      const open=bottom?.querySelector('.popular-card-cta');
      if(!bottom||!open||bottom.querySelector('[data-popular-add-cart]')) return;

      let actions=bottom.querySelector('.popular-card-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='popular-card-actions';
        bottom.insertBefore(actions,open);
        actions.appendChild(open);
      }

      const add=document.createElement('button');
      add.className='popular-add-cart';
      add.type='button';
      add.dataset.popularAddCart='';
      add.innerHTML='<span>В корзину</span>';
      actions.insertBefore(add,open);

      add.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const item=popularCardItem(card);
        if(!item) return;
        if(!addProduct(item))return;
        add.classList.add('is-added');
        add.querySelector('span:last-child').textContent='Добавлено ✓';
        setTimeout(()=>{
          add.classList.remove('is-added');
          const label=add.querySelector('span:last-child');
          if(label) label.textContent='В корзину';
        },1400);
      });
    });
  }

  // Individual size requests are not yet connected. Do not simulate acceptance.
  function initCustomSize(){
    function open(item,trigger){
      let dialog=document.querySelector('[data-quote-unavailable]');
      if(!dialog){
        dialog=document.createElement('dialog');dialog.className='custom-size-dialog';dialog.dataset.quoteUnavailable='';
        dialog.innerHTML='<div class="custom-size-head"><div><p class="custom-size-kicker">ИНДИВИДУАЛЬНЫЙ РАЗМЕР</p><h2>Запросить расчёт</h2></div><button type="button" class="custom-size-close" aria-label="Закрыть">×</button></div><div class="custom-size-product" data-quote-product></div><p class="custom-size-note">Онлайн-запрос индивидуального размера пока не подключён. Для расчёта обратитесь к менеджеру.</p><a class="custom-size-submit" href="payment-delivery.html#contacts">Контакты менеджера</a>';
        document.body.append(dialog);dialog.querySelector('.custom-size-close').addEventListener('click',()=>dialog.close());
      }
      dialog.querySelector('[data-quote-product]').textContent=[item?.title,item?.sku?'Арт. '+item.sku:'',item?.finish].filter(Boolean).join(' · ');
      if(!dialog.open){dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}),{once:true});dialog.showModal();}
    }
    document.querySelectorAll('.popular-card[data-product-card]').forEach(card=>{
      const sizes=card.querySelector('.popular-size-switcher');
      if(!sizes||sizes.parentNode.querySelector('.custom-size-link'))return;
      const button=document.createElement('button');button.type='button';button.className='custom-size-link';button.textContent='Нужен другой размер?';
      sizes.insertAdjacentElement('afterend',button);
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(popularCardItem(card,true),button);});
    });
    document.querySelectorAll('.final-product-info .custom-size-inline').forEach(link=>{
      link.setAttribute('aria-haspopup','dialog');link.addEventListener('click',e=>{e.preventDefault();open(currentProduct(),link);});
    });
  }

  function setCart(items){write(CART_KEY,items);updateHeaderCount();document.dispatchEvent(new CustomEvent('derzhava:cartchange'))}

  // Sticky header height varies across desktop and mobile. Scroll to a visible
  // position rather than aligning the target with the covered viewport edge.
  function scrollCartSection(section){
    if(!section)return;
    const header=document.querySelector('.site-header');
    const headerHeight=header?header.getBoundingClientRect().height:0;
    const gap=window.innerWidth<=720?14:24;
    const top=Math.max(0,window.scrollY+section.getBoundingClientRect().top-headerHeight-gap);
    window.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }

  function renderCart(){
    const root=document.querySelector('[data-cart-page]');
    if(!root) return;
    const list=root.querySelector('[data-cart-list]');
    const summary=root.querySelector('[data-cart-summary]');
    const checkout=root.querySelector('[data-checkout-panel]');
    const success=root.querySelector('[data-order-success]');
    if(success) success.hidden=true;
    root.classList.remove('order-completed');
    const items=cart();

    if(!items.length){
      list.innerHTML='<div class="cart-empty"><strong>Корзина пока пуста</strong><p>Выберите герб, размер и добавьте его в корзину.</p><a class="button button-gold" href="catalog.html">Перейти в каталог</a></div>';
      summary.innerHTML='<h2>Ваш заказ</h2><div class="summary-row"><span>Товаров</span><strong>0</strong></div><div class="summary-total"><span>Итого</span><strong>0 ₽</strong></div><a class="cart-continue-button" href="catalog.html">← Продолжить покупки</a>';
      if(checkout) checkout.hidden=true;
      return;
    }

    list.innerHTML=items.map((item,i)=>'<article class="cart-item" data-cart-index="'+i+'">'+
      '<a class="cart-item-media" href="'+esc(safePath(item.url,true))+'"><img src="'+esc(safePath(item.image))+'" alt=""></a>'+
      '<div><div class="cart-item-meta">'+esc(item.finish)+'</div><h3><a href="'+esc(safePath(item.url,true))+'">'+esc(item.title)+'</a></h3>'+
      (item.sku?'<div class="cart-item-meta">Артикул: '+esc(item.sku)+'</div>':'')+
      '<div class="cart-item-meta">Размер: '+esc(item.size)+'</div><div class="cart-item-price">'+money(item.price)+'</div>'+
      '<div class="cart-item-actions"><div class="qty-control"><button type="button" data-qty="-1">−</button><span>'+esc(item.qty)+'</span><button type="button" data-qty="1">+</button></div><button class="cart-remove" type="button" data-remove>Удалить</button></div></div>'+
      '<div class="cart-line-total">'+money(item.price*item.qty)+'</div></article>').join('');

    summary.innerHTML='<h2>Ваш заказ</h2>'+
      '<div class="summary-row"><span>Позиций</span><strong>'+items.length+'</strong></div>'+
      '<div class="summary-row"><span>Количество</span><strong>'+cartCount()+'</strong></div>'+
      '<div class="summary-row"><span>Доставка</span><strong>Уточняется</strong></div>'+
      '<div class="summary-total"><span>Итого</span><strong>'+money(cartTotal())+'</strong></div>'+
      '<button class="cart-checkout-button" type="button" data-open-checkout>Перейти к оформлению</button>'+
      '<a class="cart-continue-button" href="catalog.html">← Продолжить покупки</a>'+
      '<p class="cart-summary-note">Оплата и доставка согласовываются отдельно.</p>';

    list.querySelectorAll('[data-cart-index]').forEach(row=>{
      const i=Number(row.dataset.cartIndex);
      row.querySelectorAll('[data-qty]').forEach(btn=>btn.addEventListener('click',()=>{
        const next=cart();const item=next[i];if(!item)return;
        if(busy)return;item.qty=Math.min(100,Math.max(1,(Number(item.qty)||1)+Number(btn.dataset.qty)));setCart(next);renderCart();
      }));
      row.querySelector('[data-remove]')?.addEventListener('click',()=>{
        if(busy)return;const next=cart();next.splice(i,1);setCart(next);renderCart();
      });
    });

    applyCartPolicy(root,items,summary);
    summary.querySelector('[data-open-checkout]')?.addEventListener('click',()=>{
      checkout.hidden=false;fillCheckout();requestAnimationFrame(()=>scrollCartSection(checkout));
    });
  }

  function status(value){const el=document.querySelector('[data-checkout-status]');if(el){el.textContent=value;el.hidden=!value;}}
  async function fillCheckout(){
    const form=document.querySelector('[data-checkout-form]');if(!form||busy)return;
    const current=++fillGeneration,note=document.querySelector('[data-checkout-identity]');
    if(!canonical){note.textContent='Оформление доступно только на gerbrf.ru.';return;}
    note.textContent='Проверяем личный кабинет…';
    try{
      const response=await fetch('/api/account/profile',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
      if(current!==fillGeneration)return;
      if(response.status===401){note.textContent='Можно оформить заказ без регистрации.';return;}
      if(!response.ok)throw Error();
      const p=await response.json();
      if(current!==fillGeneration)return;
      if(typeof p.name!=='string'||!Array.isArray(p.addresses)||typeof p.registrationComplete!=='boolean')throw Error();
      const values={name:p.name,phone:p.contactPhone,email:p.contactEmail,organization:p.organization,inn:p.inn,address:p.addresses[0]};
      Object.entries(values).forEach(([k,v])=>{if(typeof v==='string'&&!form.elements[k].value)form.elements[k].value=v;});
      note.textContent='Вы вошли в личный кабинет. Заказ будет доступен в разделе «Мои заказы».';
      const saved=document.querySelector('[data-saved-addresses]');
      saved.replaceChildren(new Option('Выбрать сохранённый адрес',''));
      p.addresses.filter(x=>typeof x==='string').forEach(x=>saved.add(new Option(x,x)));
      saved.hidden=p.addresses.length<2;
    }catch{if(current===fillGeneration)note.textContent='Не удалось загрузить профиль. Можно заполнить данные вручную.';}
  }
  // Same random request key for identical retry; no contact values stored locally.
  const attemptKey='derzhava_order_attempt_v2';
  let memoryAttempt=null;
  async function fingerprint(key,payload){
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key+'\0'+JSON.stringify(payload)));
    return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function requestKey(payload){
    let old=memoryAttempt;
    try{old=old||JSON.parse(sessionStorage.getItem(attemptKey)||'null');}catch{}
    if(old&&typeof old.key==='string'&&old.hash===await fingerprint(old.key,payload))return old.key;
    if(old?.uncertain)throw Error('Результат предыдущей отправки неизвестен. Для безопасного повтора верните прежние данные заказа или свяжитесь с менеджером.');
    const key=crypto.randomUUID();
    memoryAttempt={key,hash:await fingerprint(key,payload),uncertain:true};
    try{sessionStorage.setItem(attemptKey,JSON.stringify(memoryAttempt));}catch{}
    return key;
  }
  function clearAttempt(){memoryAttempt=null;try{sessionStorage.removeItem(attemptKey);}catch{}}
  function initCheckout(){
    const form=document.querySelector('[data-checkout-form]');if(!form)return;
    const submit=form.querySelector('.checkout-submit'),cancel=document.querySelector('[data-checkout-cancel]'),saved=document.querySelector('[data-saved-addresses]');
    saved.addEventListener('change',()=>{if(saved.value)form.elements.address.value=saved.value;});
    cancel.addEventListener('click',()=>{if(busy)return;++fillGeneration;document.querySelector('[data-checkout-panel]').hidden=true;});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const items=cart();if(!items.length)return;
      if(!canonical){status('Оформление доступно только на gerbrf.ru.');return;}
      if(catalogState!=='published'||!catalogSnapshot?.intakeEnabled){status('Приём заказов пока закрыт.');return;}
      const fd=new FormData(form),get=k=>String(fd.get(k)||'').trim(),lines=new Map();
      for(const item of items){
        const size=canonicalSize(item.size),sku=String(item.sku||''),quantity=Number(item.qty),expectedPrice=Number(item.price);
        if(!size||!/^[A-Za-z0-9_-]{1,40}$/.test(sku)||!Number.isInteger(quantity)||quantity<1||quantity>100||!Number.isInteger(expectedPrice)||expectedPrice<1){status('Обновите корзину: один из товаров имеет некорректные данные.');return;}
        const key=sku+'|'+size,old=lines.get(key);
        if(old){if(old.expectedPrice!==expectedPrice||old.quantity+quantity>100){status('Обновите количество или цену товара в корзине.');return;}old.quantity+=quantity;}
        else lines.set(key,{sku,size,quantity,expectedPrice});
      }
      const payload={name:get('name'),phone:normalizePhone(get('phone')),email:get('email')||null,organization:get('organization'),inn:get('inn'),address:get('address'),delivery:get('delivery'),comment:get('comment').replace(/\r?\n/g,' '),items:[...lines.values()].sort((a,b)=>(a.sku+'|'+a.size).localeCompare(b.sku+'|'+b.size))};
      if(!payload.name||!/^\+[1-9][0-9]{6,14}$/.test(payload.phone)||!/^(?:[0-9]{10}|[0-9]{12})?$/.test(payload.inn)){status('Проверьте имя, телефон и ИНН.');return;}
      const snapshot=JSON.stringify(items);
      busy=true;++fillGeneration;
      const controls=[...form.querySelectorAll('input,select,textarea,button')];
      controls.forEach(el=>el.disabled=true);submit.textContent='Отправляем…';status('');
      try{
        await refreshCatalog({render:false});
        if(catalogState!=='published'||!catalogSnapshot?.intakeEnabled){status('Приём заказов закрыт или каталог недоступен. Корзина сохранена.');return;}
        const comparison=catalogModel.compareCart(items,catalogSnapshot);
        if(comparison.missing.length||comparison.changed.length||JSON.stringify(cart())!==snapshot){
          status('Цена или доступность изменились. Проверьте корзину перед оформлением.');
          applyCartPolicy(document.querySelector('[data-cart-page]'),cart(),document.querySelector('[data-cart-summary]'));
          return;
        }
        const key=await requestKey(payload);
        const response=await fetch('/api/orders',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...payload,requestKey:key}),signal:AbortSignal.timeout(15000)});
        const result=await response.json();
        if(!response.ok){
          const messages={orders_closed:'Приём заказов пока закрыт. Корзина сохранена.',invalid_order:'Проверьте контактные данные и товары.',price_changed:'Цена изменилась. Обновите карточку товара и добавьте его в корзину заново.',variant_unavailable:'Этот вариант товара пока недоступен.',rate_limited:'Слишком много запросов. Повторите попытку позже.',session_expired:'Сессия завершена. Войдите снова в личный кабинет.',request_conflict:'Не удалось повторить заявку. Свяжитесь с менеджером.'};
          // Only discard a key after a definite rejection of this attempt.
          if(['orders_closed','invalid_order','price_changed','variant_unavailable','rate_limited','session_expired'].includes(result.error))clearAttempt();
          status(messages[result.error]||'Не удалось подтвердить отправку. Повторите с теми же данными.');return;
        }
        if(!/^[1-9][0-9]*$/.test(result.number)||!Number.isSafeInteger(result.total)||result.total<1||typeof result.linked!=='boolean')throw Error();
        let cleared=false;
        if(JSON.stringify(cart())===snapshot){try{setCart([]);cleared=true;}catch{}}
        if(cleared)clearAttempt();
        form.reset();saved.replaceChildren();saved.hidden=true;
        document.querySelector('[data-checkout-panel]').hidden=true;renderCart();
        const success=document.querySelector('[data-order-success]');success.hidden=false;
        const note=result.linked?'Заявка сохранена. Статус доступен в личном кабинете.':'Заявка сохранена. Менеджер свяжется с вами по указанным контактам.';
        const warning=cleared?'':'<p>Корзина не очищена. Не отправляйте этот заказ повторно.</p>';
        const link=result.linked?'<a class="button button-gold" href="account.html">Перейти в личный кабинет</a>':'';
        if(cleared)document.querySelector('[data-cart-page]').classList.add('order-completed');
        success.innerHTML='<p class="order-success-kicker">ЗАЯВКА ПРИНЯТА</p><h2>Заказ ДРЖ-'+esc(result.number)+'</h2><p>'+note+'</p>'+warning+'<div class="order-success-total"><span>Стоимость товаров</span><strong>'+money(result.total)+'</strong></div><div class="order-success-actions">'+link+'<a class="button order-secondary" href="catalog.html">Продолжить покупки</a></div>';
        requestAnimationFrame(()=>scrollCartSection(success));
      }catch(error){status(error?.message?.startsWith('Результат предыдущей')?error.message:'Не удалось подтвердить отправку. Корзина сохранена; повторите с теми же данными.');}
      finally{busy=false;controls.forEach(el=>el.disabled=false);submit.textContent='Оформить заказ';}
    });
    window.addEventListener('pagehide',()=>{++fillGeneration;form.reset();saved.replaceChildren();saved.hidden=true;});
    window.addEventListener('pageshow',event=>{if(event.persisted&&!document.querySelector('[data-checkout-panel]').hidden)fillCheckout();});
  }

  function rememberPrice(el){
    if(!originalPricing.has(el))originalPricing.set(el,{text:el.textContent,price:el.dataset.price,disabled:el.disabled});
    return originalPricing.get(el);
  }
  function sizeFor(button,isCard){
    if(!isCard)return canonicalSize(button.dataset.size||button.textContent);
    return canonicalSize([button.querySelector('span')?.textContent||button.textContent,button.querySelector('small')?.textContent||''].join(' '));
  }
  function updatePriceGroup(root,isCard){
    const sku=(root.querySelector(isCard?'.popular-card-sku':'.product-article')?.textContent||'').replace(/[^0-9]/g,'').slice(0,4);
    const buttons=[...root.querySelectorAll(isCard?'[data-card-size]':'.size-option')];
    const price=root.querySelector(isCard?'.popular-card-price':'.final-price');
    const add=root.querySelector(isCard?'[data-popular-add-cart]':'.shop-add-button');
    if(!sku||!buttons.length||!price)return;
    const fallback=rememberPrice(price);
    let active=buttons.find(b=>b.classList.contains('active'))||buttons[0];
    for(const button of buttons){
      const old=rememberPrice(button);
      if(catalogState==='draft'||!canonical){
        if(old.price===undefined)delete button.dataset.price;else button.dataset.price=old.price;
        button.disabled=!!old.disabled;button.removeAttribute('data-catalog-unavailable');
      }else{
        const v=catalogState==='published'?catalogSnapshot.byKey.get(catalogModel.variantKey(sku,sizeFor(button,isCard))):null;
        button.disabled=!v;
        if(v){button.dataset.price=String(v.price);button.removeAttribute('data-catalog-unavailable');}
        else{delete button.dataset.price;button.dataset.catalogUnavailable='true';}
      }
    }
    if(active.disabled)active=buttons.find(b=>!b.disabled)||null;
    for(const button of buttons){
      button.classList.toggle('active',button===active);
      if(isCard)button.setAttribute('aria-pressed',String(button===active));
    }
    if(active&&Number(active.dataset.price)>0)price.textContent=money(Number(active.dataset.price));
    else price.textContent=catalogState==='pending'?'Уточняем цену':catalogState==='error'?'Цена недоступна':'Нет в продаже';
    if(add){add.disabled=!active;add.title=active?'':'Нет доступного размера';}
    if(catalogState==='draft'&&!active)price.textContent=fallback.text;
  }
  function applyCatalogPrices(){
    document.querySelectorAll('.popular-card[data-product-card]').forEach(card=>updatePriceGroup(card,true));
    document.querySelectorAll('.final-product-info').forEach(info=>updatePriceGroup(info,false));
  }
  function applyCartPolicy(root,items,summary){
    if(!root||!summary||!items.length)return;
    const button=summary.querySelector('[data-open-checkout]');
    if(!button)return;
    summary.querySelector('[data-catalog-cart-note]')?.remove();
    summary.querySelector('[data-catalog-refresh-prices]')?.remove();
    let comparison=null,note='';
    if(catalogState==='published'){
      comparison=catalogModel.compareCart(items,catalogSnapshot);
      if(comparison.missing.length)note='Некоторые размеры больше недоступны. Удалите их из корзины.';
      else if(comparison.changed.length)note='Цены изменились. Подтвердите обновление стоимости корзины.';
      else if(!catalogSnapshot.intakeEnabled)note='Приём заказов пока закрыт.';
    }else note=catalogState==='draft'?'Тестовый каталог. Приём заказов закрыт.':catalogState==='pending'?'Проверяем актуальные цены…':'Не удалось проверить каталог. Обновите страницу.';
    button.disabled=!!note;
    if(note){
      const el=document.createElement('p');el.className='cart-summary-note';el.dataset.catalogCartNote='';el.textContent=note;button.insertAdjacentElement('beforebegin',el);
    }
    if(comparison){
      const rows=root.querySelectorAll('[data-cart-index]');
      for(const i of comparison.missing){const row=rows[i];if(row&&!row.querySelector('[data-variant-warning]')){const el=document.createElement('p');el.dataset.variantWarning='';el.className='cart-item-meta';el.textContent='Размер недоступен';row.querySelector('h3')?.after(el);}}
      for(const i of comparison.changed){const row=rows[i];if(row&&!row.querySelector('[data-variant-warning]')){const el=document.createElement('p');el.dataset.variantWarning='';el.className='cart-item-meta';el.textContent='Новая цена: '+money(comparison.updated[i].price);row.querySelector('h3')?.after(el);}}
      if(comparison.changed.length&&!comparison.missing.length){
        const refresh=document.createElement('button');refresh.type='button';refresh.className='cart-continue-button';refresh.dataset.catalogRefreshPrices='';refresh.textContent='Принять новые цены';
        const previous=JSON.stringify(items);
        refresh.addEventListener('click',()=>{if(busy||JSON.stringify(cart())!==previous)return;setCart(comparison.updated);renderCart();});
        button.insertAdjacentElement('beforebegin',refresh);
      }
    }
  }
  async function refreshCatalog({render=true}={}){
    if(!canonical){catalogState='draft';applyCatalogPrices();if(render&&!busy)renderCart();return;}
    if(catalogPromise)return catalogPromise;
    const current=++catalogGeneration;
    catalogPromise=(async()=>{
      try{
        catalogModel=catalogModel||await import('./catalog-pricing.js?v=20261127-catalog1');
        const r=await fetch('/api/catalog/variants',{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
        if(!r.ok)throw Error();
        const snapshot=catalogModel.parseCatalog(await r.json());
        if(current!==catalogGeneration)return;
        catalogSnapshot=snapshot;catalogState=snapshot.published?'published':'draft';
      }catch{if(current===catalogGeneration){catalogSnapshot=null;catalogState='error';}}
      finally{if(current===catalogGeneration){applyCatalogPrices();if(render&&!busy)renderCart();catalogPromise=null;}}
    })();
    return catalogPromise;
  }

  injectHeader();
  if(document.body.hasAttribute('data-dynamic-page')){
    window.addEventListener('storage',e=>{if(e.key===CART_KEY)updateHeaderCount();});
    window.addEventListener('pageshow',updateHeaderCount);
    return;
  }
  initProductPage();initCatalogQuickAdd();initCustomSize();renderCart();initCheckout();
  applyCatalogPrices();refreshCatalog();
  document.addEventListener('derzhava:catalog-render',()=>{initCatalogQuickAdd();applyCatalogPrices();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)refreshCatalog();});
  window.addEventListener('storage',e=>{if(e.key===CART_KEY){updateHeaderCount();if(!busy)renderCart();}});
  window.addEventListener('pageshow',e=>{if(e.persisted){updateHeaderCount();if(!busy){renderCart();refreshCatalog();}}});
})();
