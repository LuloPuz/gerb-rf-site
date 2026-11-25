
(() => {
  if(window.__derzhavaShopInit) return;
  window.__derzhavaShopInit=true;
  const CART_KEY='derzhava_cart_v1';
  const PROFILE_KEY='derzhava_profile_v1';
  const ORDERS_KEY='derzhava_orders_v1';
  const AUTH_KEY='derzhava_auth_v1';
  const AUTH_PENDING_KEY='derzhava_auth_pending_v1';
  const AUTH_RATE_KEY='derzhava_auth_rate_v1';
  const AUTH_BUDGET_KEY='derzhava_auth_budget_v1';
  const AUTH_DAILY_BUDGET_RUB=500;
  const AUTH_ESTIMATED_COST_RUB=6.29;

  const money=n=>new Intl.NumberFormat('ru-RU').format(Number(n)||0)+' ₽';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const cart=()=>read(CART_KEY,[]);
  const profile=()=>read(PROFILE_KEY,{name:'',phone:'',email:'',organization:'',inn:'',address:''});
  const orders=()=>read(ORDERS_KEY,[]);
  const auth=()=>read(AUTH_KEY,null);
  const normalizeContact=value=>{const raw=String(value||'').trim();if(raw.includes('@'))return raw.toLowerCase();let p=raw.replace(/\D/g,'');if(p.length===10)p='7'+p;if(p.length===11&&p[0]==='8')p='7'+p.slice(1);return p;};
  let refreshAccount=()=>{};
  const displayNumber=n=>String(n||'').replace(/^ТЕСТ-/,'ДРЖ-');
  const cartCount=()=>cart().reduce((sum,item)=>sum+(Number(item.qty)||1),0);
  const cartTotal=()=>cart().reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||1),0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

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
    const items=cart();
    const existing=items.find(x=>x.id===item.id);
    if(existing) existing.qty=(Number(existing.qty)||1)+1; else items.push(item);
    write(CART_KEY,items);updateHeaderCount();
    document.querySelectorAll('[data-cart-link]').forEach(link=>{
      link.classList.remove('cart-attention');
      void link.offsetWidth;
      link.classList.add('cart-attention');
      setTimeout(()=>link.classList.remove('cart-attention'),900);
    });
    toast('<strong>Добавлено в корзину</strong><br>'+esc(item.title)+' · '+esc(item.size),true);
    document.dispatchEvent(new CustomEvent('derzhava:cartchange'));
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
      addProduct(item);
      add.classList.add('is-added');add.textContent='Добавлено ✓';
      setTimeout(()=>{add.classList.remove('is-added');add.textContent='Добавить в корзину'},1500);
    });
  }

  function popularCardItem(card){
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
    if(!price) return null;
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
        addProduct(item);
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
      '<a class="cart-item-media" href="'+esc(item.url)+'"><img src="'+esc(item.image)+'" alt=""></a>'+
      '<div><div class="cart-item-meta">'+esc(item.finish)+'</div><h3><a href="'+esc(item.url)+'">'+esc(item.title)+'</a></h3>'+
      (item.sku?'<div class="cart-item-meta">Артикул: '+esc(item.sku)+'</div>':'')+
      '<div class="cart-item-meta">Размер: '+esc(item.size)+'</div><div class="cart-item-price">'+money(item.price)+'</div>'+
      '<div class="cart-item-actions"><div class="qty-control"><button type="button" data-qty="-1">−</button><span>'+item.qty+'</span><button type="button" data-qty="1">+</button></div><button class="cart-remove" type="button" data-remove>Удалить</button></div></div>'+
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
        item.qty=Math.max(1,(Number(item.qty)||1)+Number(btn.dataset.qty));setCart(next);renderCart();
      }));
      row.querySelector('[data-remove]')?.addEventListener('click',()=>{
        const next=cart();next.splice(i,1);setCart(next);renderCart();
      });
    });

    summary.querySelector('[data-open-checkout]')?.addEventListener('click',()=>{
      checkout.hidden=false;fillCheckout();requestAnimationFrame(()=>scrollCartSection(checkout));
    });
  }

  function fillCheckout(){
    const form=document.querySelector('[data-checkout-form]');if(!form)return;
    const p=profile();
    ['name','phone','email','organization','inn','address'].forEach(k=>{if(form.elements[k]&&!form.elements[k].value)form.elements[k].value=p[k]||''});
  }

  function initCheckout(){
    const form=document.querySelector('[data-checkout-form]');
    if(!form) return;
    
    document.querySelector('[data-checkout-cancel]')?.addEventListener('click',()=>{document.querySelector('[data-checkout-panel]').hidden=true});
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const items=cart();if(!items.length)return;
      const submit=form.querySelector('.checkout-submit');
      if(submit?.disabled)return;
      const originalLabel=submit?.textContent||'Оформить заказ';
      if(submit){submit.disabled=true;submit.textContent='Оформляем…'}

      const fd=new FormData(form);
      const customer={
        name:String(fd.get('name')||'').trim(),
        phone:String(fd.get('phone')||'').trim(),
        email:String(fd.get('email')||'').trim(),
        organization:String(fd.get('organization')||'').trim(),
        inn:String(fd.get('inn')||'').trim(),
        address:String(fd.get('address')||'').trim()
      };
      const delivery=String(fd.get('delivery')||'');
      const comment=String(fd.get('comment')||'');
      if(!customer.name || !/^7\d{10}$/.test(normalizeContact(customer.phone))){toast('<strong>Проверьте данные</strong><br>Укажите имя и корректный телефон +7.');if(submit){submit.disabled=false;submit.textContent=originalLabel}return;}
      let number;do{number='ДРЖ-'+String(1000000+crypto.getRandomValues(new Uint32Array(1))[0]%9000000);}while(orders().some(o=>o.number===number));
      let total=cartTotal();
      let remoteSaved=false;

      try{
        if(window.DerzhavaBackend?.configured()){
          const result=await window.DerzhavaBackend.createOrder({customer,items,delivery,comment});
          if(result?.number) number=String(result.number);
          if(Number(result?.total)>0) total=Number(result.total);
          remoteSaved=true;
        }
      }catch(error){
        toast('<strong>Заказ не отправлен</strong><br>'+esc(error?.message||'Ошибка соединения с базой'));
        if(submit){submit.disabled=false;submit.textContent=originalLabel}
        return;
      }

      const now=new Date();
      const order={number,date:now.toISOString(),status:'Заказ принят',items,total,customer,delivery,comment,remote:remoteSaved,test:!remoteSaved,history:[{status:'Заказ принят',at:now.toISOString()}]};
      try{const all=orders();all.unshift(order);write(ORDERS_KEY,all);write(PROFILE_KEY,customer);setCart([]);}catch(error){toast('<strong>Ошибка локального сохранения</strong><br>Проверьте доступное место в браузере.');if(submit){submit.disabled=false;submit.textContent=originalLabel}return;}
      if(submit){submit.disabled=false;submit.textContent=originalLabel;}
      form.reset();

      document.querySelector('[data-checkout-panel]').hidden=true;
      renderCart();
      const success=document.querySelector('[data-order-success]');
      if(success){
        success.hidden=false;
        const note=remoteSaved?'Спасибо за заказ! Информация о заказе и его текущий статус доступны в личном кабинете.':'Спасибо! Заказ сохранён для проверки. Информация о заказе и его текущий статус доступны в личном кабинете.';
        const actions='<div class="order-success-actions"><a class="button button-gold" href="account.html">Перейти в личный кабинет</a><a class="button order-secondary" href="catalog.html">Продолжить покупки</a></div>';
        document.querySelector('[data-cart-page]').classList.add('order-completed');
        success.innerHTML='<div class="order-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></div><p class="order-success-kicker">ЗАКАЗ ОФОРМЛЕН</p><h2>Заказ '+esc(displayNumber(number))+'</h2><p>'+note+'</p><div class="order-success-total"><span>Сумма заказа</span><strong>'+money(order.total)+'</strong></div>'+actions;
        requestAnimationFrame(()=>scrollCartSection(success));
      }
    });
  }

  function renderAccount(){
    const root=document.querySelector('[data-account-page]');if(!root)return;

    const normalizeIdentifier=normalizeContact;
    const isValidIdentifier=value=>{
      const raw=String(value||'').trim();
      if(raw.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
      return /^7\d{10}$/.test(normalizeContact(raw));
    };
    const statusSteps=['Заказ принят','Подтверждён','В производстве','Готов','Отправлен','Получен'];
    const statusKeys=['accepted','confirmed','production','ready','shipped','received'];
    const statusIndex=status=>{
      const raw=String(status||'').toLowerCase();
      if(raw.includes('получ')) return 5;
      if(raw.includes('отправ')||raw.includes('достав')) return 4;
      if(raw.includes('готов')) return 3;
      if(raw.includes('производ')) return 2;
      if(raw.includes('подтверж')) return 1;
      return 0;
    };
    const friendlyStatus=status=>status==='Отменён'?'Отменён':statusSteps[statusIndex(status)];

    function contactHasOrder(identifier){
      const key=normalizeIdentifier(identifier);
      if(!key) return false;
      return orders().some(order=>{
        const customer=order.customer||{};
        return [customer.phone,customer.email].some(value=>normalizeIdentifier(value)===key);
      });
    }

    function checkAndRecordRate(identifier){
      const now=Date.now();
      const hour=60*60*1000;
      const cooldown=60*1000;
      const key=normalizeIdentifier(identifier);
      let state=read(AUTH_RATE_KEY,{events:[]});
      state.events=(Array.isArray(state.events)?state.events:[]).filter(event=>now-Number(event.at||0)<hour);

      const byContact=state.events.filter(event=>event.key===key);
      const latest=byContact.reduce((max,event)=>Math.max(max,Number(event.at)||0),0);

      if(latest && now-latest<cooldown){
        return {ok:false,reason:'cooldown',retryMs:cooldown-(now-latest)};
      }
      if(byContact.length>=5){
        return {ok:false,reason:'contact-hour'};
      }
      if(state.events.length>=15){
        return {ok:false,reason:'browser-hour'};
      }

      state.events.push({key,at:now});
      write(AUTH_RATE_KEY,state);
      return {ok:true};
    }

    function currentBudgetDay(){
      const now=new Date();
      return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    }

    function checkAndRecordBudget(){
      const day=currentBudgetDay();
      let state=read(AUTH_BUDGET_KEY,{day,spent:0,count:0});
      if(state.day!==day) state={day,spent:0,count:0};

      const projected=(Number(state.spent)||0)+AUTH_ESTIMATED_COST_RUB;
      if(projected>AUTH_DAILY_BUDGET_RUB){
        return {ok:false,spent:Number(state.spent)||0,limit:AUTH_DAILY_BUDGET_RUB};
      }

      state.spent=Number(projected.toFixed(2));
      state.count=(Number(state.count)||0)+1;
      write(AUTH_BUDGET_KEY,state);
      return {ok:true,spent:state.spent,limit:AUTH_DAILY_BUDGET_RUB};
    }

    async function requestCode(identifier){
      const api=String(window.DERZHAVA_AUTH_API||'').replace(/\/$/,'');
      if(api){
        const response=await fetch(api+'/request-code',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({identifier})
        });

        if(response.status===402 || response.status===429){
          const payload=await response.json().catch(()=>({}));
          const error=new Error(
            payload.message ||
            (response.status===402
              ? 'Дневной лимит отправки кодов исчерпан. Попробуйте завтра.'
              : 'Слишком много запросов. Попробуйте позже.')
          );
          error.code=response.status===402?'budget-limit':'rate-limit';
          throw error;
        }
        if(!response.ok){
          const error=new Error('Если контакт связан с заказом, код будет отправлен.');
          error.code='request-failed';
          throw error;
        }

        sessionStorage.setItem(AUTH_PENDING_KEY,JSON.stringify({identifier,createdAt:Date.now(),remote:true}));
        return {demo:false};
      }

      // Local prototype mirrors the rules that must later live on the server.
      if(!contactHasOrder(identifier)){
        const error=new Error('Если контакт связан с заказом, код будет отправлен.');
        error.code='no-order';
        throw error;
      }

      const rate=checkAndRecordRate(identifier);
      if(!rate.ok){
        const error=new Error(
          rate.reason==='cooldown'
            ? 'Повторный код можно запросить примерно через '+Math.max(1,Math.ceil(rate.retryMs/1000))+' сек.'
            : rate.reason==='contact-hour'
              ? 'Лимит кодов для этого контакта исчерпан. Попробуйте позже.'
              : 'Слишком много попыток входа. Попробуйте позже.'
        );
        error.code='rate-limit';
        error.retryMs=rate.retryMs||0;
        throw error;
      }

      const budget=checkAndRecordBudget();
      if(!budget.ok){
        const error=new Error('Дневной лимит отправки кодов исчерпан. Попробуйте завтра.');
        error.code='budget-limit';
        throw error;
      }

      const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
      sessionStorage.setItem(AUTH_PENDING_KEY,JSON.stringify({identifier,code,createdAt:Date.now(),remote:false}));
      write('derzhava_owner_code_v1',{code,expiresAt:Date.now()+10*60*1000});
      return {demo:true,code};
    }

    async function verifyCode(identifier,code){
      const api=String(window.DERZHAVA_AUTH_API||'').replace(/\/$/,'');
      if(api){
        const response=await fetch(api+'/verify-code',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({identifier,code})
        });
        if(!response.ok) return false;
        const payload=await response.json().catch(()=>({}));
        write(AUTH_KEY,{identifier,verifiedAt:new Date().toISOString(),token:payload.token||''});
        sessionStorage.removeItem(AUTH_PENDING_KEY);
        return true;
      }

      let pending=null;
      try{pending=JSON.parse(sessionStorage.getItem(AUTH_PENDING_KEY)||'null')}catch(_){}
      const valid=!!pending &&
        normalizeIdentifier(pending.identifier)===normalizeIdentifier(identifier) &&
        String(pending.code||'')===String(code||'').trim() &&
        Date.now()-Number(pending.createdAt||0)<10*60*1000;
      if(valid){
        write(AUTH_KEY,{identifier,verifiedAt:new Date().toISOString(),demo:true});
        localStorage.removeItem('derzhava_owner_code_v1');
        sessionStorage.removeItem(AUTH_PENDING_KEY);
      }
      return valid;
    }

    function visibleOrdersFor(identifier){
      const key=normalizeIdentifier(identifier);
      if(!key) return [];
      return orders().filter(order=>{
        const customer=order.customer||{};
        return [customer.phone,customer.email].some(value=>normalizeIdentifier(value)===key);
      });
    }

    function orderImage(value){
      if(!value)return '';
      try{
        const image=new URL(String(value),location.href);
        const assets=new URL('assets/',location.href);
        return image.origin===assets.origin&&image.pathname.startsWith(assets.pathname)&&/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(image.pathname)?image.href:'';
      }catch(_){return '';}
    }

    function renderOrderItem(item){
      const qty=Number(item.qty)||1;
      const image=orderImage(item.image);
      const sku=String(item.sku||'').trim();
      const meta=[item.size,qty+' шт.'].filter(Boolean).join(' · ');
      return '<div class="account-order-item account-order-item-detailed">'+
        '<div class="account-order-item-photo"><span class="account-order-photo-fallback">Нет фото</span>'+
          (image?'<button type="button" class="account-order-photo-open" aria-label="Увеличить фото: '+esc(item.title||'Товар')+'" title="Увеличить фото"><img src="'+esc(image)+'" alt="'+esc(item.title||'Товар')+'" width="72" height="72" loading="lazy" decoding="async"></button>':'')+'</div>'+
        '<div class="account-order-item-info"><strong class="account-order-item-title">'+esc(item.title||'Товар')+'</strong>'+
          '<small class="account-order-item-sku">'+(sku?'Арт. '+esc(sku):'Артикул не указан')+'</small>'+
          (item.finish?'<small class="account-order-item-finish">'+esc(item.finish)+'</small>':'')+
          '<small class="account-order-item-size">'+esc(meta)+'</small></div>'+
        '<span class="account-order-item-sum">'+money((Number(item.price)||0)*qty)+'</span></div>';
    }

    // One native modal for every order photo. No navigation away from the account.
    const photoDialog=document.querySelector('[data-order-photo-dialog]');
    const photoLarge=photoDialog?.querySelector('[data-order-photo-large]');
    let photoTrigger=null;
    if(photoDialog&&photoLarge){
      photoDialog.querySelector('[data-order-photo-close]')?.addEventListener('click',()=>photoDialog.close());
      photoDialog.addEventListener('click',event=>{
        if(event.target===photoDialog){
          const rect=photoDialog.getBoundingClientRect();
          if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)photoDialog.close();
        }
      });
      photoDialog.addEventListener('close',()=>{
        photoLarge.removeAttribute('src');
        if(photoTrigger?.isConnected)photoTrigger.focus({preventScroll:true});
        photoTrigger=null;
      });
      root.addEventListener('click',event=>{
        const button=event.target.closest('.account-order-photo-open');
        if(!button||button.hidden)return;
        const image=button.querySelector('img');
        const src=orderImage(image?.getAttribute('src'));
        if(!src||photoDialog.open)return;
        photoTrigger=button;
        photoLarge.alt=image.alt;
        photoLarge.src=src;
        photoDialog.showModal();
      });
    }

    function renderOrder(order){
      const active=statusIndex(order.status);
      const cancelled=order.status==='Отменён';
      const key=cancelled?'cancelled':statusKeys[active];
      const steps=cancelled?'<div class="account-status-cancelled">Заказ отменён</div>':statusSteps.map((label,index)=>{
        const cls=index<active?' done':index===active?' active':'';
        return '<div class="account-status-step'+cls+'" data-step="'+statusKeys[index]+'"'+(index===active?' aria-current="step"':'')+'>'+esc(label)+'</div>';
      }).join('');
      const items=(order.items||[]).map(renderOrderItem).join('');
      return '<article class="account-order-v2" data-status="'+key+'">'+
        '<div class="account-order-top"><div><h3 class="account-order-number">'+esc(displayNumber(order.number))+'</h3><p class="account-order-meta">'+new Date(order.date).toLocaleString('ru-RU')+' · '+(order.items||[]).length+' поз.</p></div><span class="account-order-status-v2">'+esc(friendlyStatus(order.status))+'</span></div>'+
        '<div class="account-order-items">'+items+'</div>'+
        '<div class="account-order-total-row"><span>Итого</span><strong>'+money(order.total)+'</strong></div>'+
        '<div class="account-status-track">'+steps+'</div>'+
      '</article>';
    }

    const gate=root.querySelector('[data-auth-gate]');
    const dashboard=root.querySelector('[data-account-dashboard]');
    const requestStep=root.querySelector('[data-auth-step="request"]');
    const verifyStep=root.querySelector('[data-auth-step="verify"]');
    const requestForm=root.querySelector('[data-auth-request-form]');
    const verifyForm=root.querySelector('[data-auth-verify-form]');
    const destination=root.querySelector('[data-auth-destination]');
    const demoBox=root.querySelector('[data-auth-demo]');
    const errorBox=root.querySelector('[data-auth-error]');
    const p=profile();

    function showDashboard(){
      const state=auth();
      if(!state?.identifier) return false;
      if(gate) gate.hidden=true;
      if(dashboard) dashboard.hidden=false;
      const greeting=root.querySelector('[data-account-greeting]');
      const loginState=root.querySelector('[data-account-login-state]');
      const currentProfile=profile();
      const firstName=String(currentProfile.name||'').trim().split(/\s+/)[0]||'';
      if(greeting){
        greeting.hidden=false;
        greeting.textContent=firstName?'Здравствуйте, '+firstName:'Выполнен вход';
      }
      if(loginState){
        loginState.hidden=!firstName;
        loginState.textContent='Выполнен вход';
      }

      const all=visibleOrdersFor(state.identifier).filter(o=>!o.remote);
      const count=root.querySelector('[data-account-order-count]');if(count)count.textContent=all.length;
      const total=root.querySelector('[data-account-order-total]');if(total)total.textContent=money(all.reduce((sum,o)=>sum+(Number(o.total)||0),0));
      const cartN=root.querySelector('[data-account-cart-count]');if(cartN)cartN.textContent=cartCount();

      const ordersHost=root.querySelector('[data-account-orders]');
      if(ordersHost){
        ordersHost.innerHTML=all.length
          ? all.map(renderOrder).join('')
          : '<div class="account-empty-v2"><strong>Заказов пока нет</strong><p>Заказы, оформленные на этот телефон или e-mail, появятся здесь.</p><a class="button button-gold" href="catalog.html">Перейти в каталог</a></div>';
        ordersHost.querySelectorAll('.account-order-item-photo img').forEach(img=>{
          const hideBroken=()=>{const button=img.closest('.account-order-photo-open');if(button)button.hidden=true;else img.hidden=true;};
          img.addEventListener('error',hideBroken,{once:true});
          if(img.complete&&!img.naturalWidth)hideBroken();
        });
      }
      return true;
    }

    function showGate(){
      if(gate) gate.hidden=false;
      if(dashboard) dashboard.hidden=true;
      if(requestStep) requestStep.hidden=false;
      if(verifyStep) verifyStep.hidden=true;
      if(demoBox) demoBox.hidden=true;
      if(errorBox) errorBox.hidden=true;
    }

    refreshAccount=()=>{if(!showDashboard())showGate();};
    if(!showDashboard()){
      showGate();
      if(requestForm?.elements.identifier && !requestForm.elements.identifier.value){
        requestForm.elements.identifier.value=p.phone||p.email||'';
      }
    }

    requestForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const identifier=String(new FormData(requestForm).get('identifier')||'').trim();
      if(!isValidIdentifier(identifier)){
        toast('<strong>Проверьте контакт</strong><br>Введите корректный телефон или e-mail.');
        return;
      }
      const button=requestForm.querySelector('button[type="submit"]');
      if(button){button.disabled=true;button.textContent='Отправляем…'}
      try{
        const result=await requestCode(identifier);
        if(requestStep)requestStep.hidden=true;
        if(verifyStep)verifyStep.hidden=false;
        if(destination)destination.textContent=identifier;
        verifyForm.dataset.identifier=identifier;
        if(errorBox)errorBox.hidden=true;
        if(demoBox){
          if(result.demo){
            demoBox.hidden=false;demoBox.innerHTML='Код для пробного входа: <strong>'+esc(result.code)+'</strong>';
          }else{
            demoBox.hidden=true;
          }
        }
        verifyForm?.elements.code?.focus();
      }catch(error){
        const message=error?.message||'Не удалось отправить код. Попробуйте ещё раз.';
        toast('<strong>Вход в кабинет</strong><br>'+esc(message));
        if(error?.retryMs&&button){
          button.dataset.cooldown='true';
          let left=Math.max(1,Math.ceil(error.retryMs/1000));
          button.disabled=true;
          button.textContent='Повторить через '+left+' сек.';
          const timer=setInterval(()=>{
            left--;
            if(left<=0){
              clearInterval(timer);
              delete button.dataset.cooldown;
              button.disabled=false;
              button.textContent='Получить код';
            }else{
              button.textContent='Повторить через '+left+' сек.';
            }
          },1000);
          return;
        }
      }finally{
        if(button&&!button.dataset.cooldown){button.disabled=false;button.textContent='Получить код'}
      }
    });

    verifyForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const identifier=verifyForm.dataset.identifier||'';
      const code=String(new FormData(verifyForm).get('code')||'').trim();
      if(errorBox)errorBox.hidden=true;
      let ok=false;try{ok=await verifyCode(identifier,code)}catch(_){ok=false;}
      if(!ok){
        if(errorBox){
          errorBox.hidden=false;
          errorBox.textContent='Код неверный или уже истёк. Проверьте цифры и попробуйте ещё раз.';
        }
        return;
      }
      showDashboard();
      toast('<strong>Вход выполнен</strong><br>Добро пожаловать в личный кабинет.');
    });

    root.querySelector('[data-auth-back]')?.addEventListener('click',()=>{
      if(requestStep)requestStep.hidden=false;
      if(verifyStep)verifyStep.hidden=true;
      if(errorBox)errorBox.hidden=true;
      if(demoBox)demoBox.hidden=true;
    });

    root.querySelector('[data-auth-signout]')?.addEventListener('click',()=>{
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem('derzhava_owner_code_v1');
      showGate();
    });

    const form=root.querySelector('[data-profile-form]');
    if(form){
      ['name','phone','email','organization','inn','address'].forEach(k=>{if(form.elements[k])form.elements[k].value=p[k]||''});
      form.addEventListener('submit',e=>{
        e.preventDefault();
        const fd=new FormData(form);
        const next={};
        ['name','phone','email','organization','inn','address'].forEach(k=>next[k]=String(fd.get(k)||''));
        write(PROFILE_KEY,next);
        toast('<strong>Данные сохранены</strong><br>Они будут подставляться при оформлении заказа.');
      });
    }

    const tabs=[...root.querySelectorAll('[data-account-tab]')];
    const panels=[...root.querySelectorAll('[data-account-panel]')];
    tabs.forEach(btn=>btn.addEventListener('click',()=>{
      tabs.forEach(x=>x.classList.toggle('active',x===btn));
      panels.forEach(panel=>panel.hidden=panel.dataset.accountPanel!==btn.dataset.accountTab);
    }));
  }

  window.__derzhavaAuthLimits={
    dailyBudgetRub:AUTH_DAILY_BUDGET_RUB,
    estimatedCostRub:AUTH_ESTIMATED_COST_RUB,
    maxPerContactHour:5,
    maxPerBrowserHour:15,
    cooldownSeconds:60
  };

  injectHeader();
  initProductPage();
  initCatalogQuickAdd();
  renderCart();
  initCheckout();
  renderAccount();
  window.addEventListener('storage',event=>{if(event.key===CART_KEY){updateHeaderCount();renderCart();}if(event.key===ORDERS_KEY||event.key===AUTH_KEY)refreshAccount();});
  window.addEventListener('pageshow',event=>{if(event.persisted){updateHeaderCount();refreshAccount();}});
})();
