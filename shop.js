
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
  const cartCount=()=>cart().reduce((sum,item)=>sum+(Number(item.qty)||1),0);
  const cartTotal=()=>cart().reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||1),0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function toast(html){
    let el=document.querySelector('.shop-toast');
    if(!el){el=document.createElement('div');el.className='shop-toast';document.body.appendChild(el)}
    el.innerHTML=html;el.classList.add('show');
    clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600);
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
    const image=document.querySelector('[data-gallery-main]')?.getAttribute('src')||document.querySelector('.final-product-main img')?.getAttribute('src')||'';
    const url=location.pathname.split('/').pop()+location.search;
    return {id:url+'|'+size,title,finish,size,price,image,url,qty:1};
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
    toast('<strong>Добавлено в корзину</strong><br>'+esc(item.title)+' · '+esc(item.size));
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

  function setCart(items){write(CART_KEY,items);updateHeaderCount();document.dispatchEvent(new CustomEvent('derzhava:cartchange'))}

  function renderCart(){
    const root=document.querySelector('[data-cart-page]');
    if(!root) return;
    const list=root.querySelector('[data-cart-list]');
    const summary=root.querySelector('[data-cart-summary]');
    const checkout=root.querySelector('[data-checkout-panel]');
    const success=root.querySelector('[data-order-success]');
    if(success) success.hidden=true;
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
      '<p class="cart-summary-note">После оформления заказ сохранится в кабинете. Оплата и доставка подтверждаются менеджером.</p>';

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
      checkout.hidden=false;fillCheckout();
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
      write(PROFILE_KEY,customer);

      let number='ДРЖ-'+String(Date.now()).slice(-7);
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
      const order={number,date:now.toISOString(),status:'Заказ принят',items,total,customer,delivery,comment,remote:remoteSaved};
      const all=orders();all.unshift(order);write(ORDERS_KEY,all);setCart([]);

      const lines=order.items.map(x=>'• '+x.title+' — '+x.size+' × '+x.qty+' = '+money(x.price*x.qty)).join('\n');
      const body='Заказ '+number+'\n\n'+lines+'\n\nИтого: '+money(order.total)+'\n\nПокупатель: '+customer.name+'\nТелефон: '+customer.phone+'\nEmail: '+customer.email+'\nОрганизация: '+customer.organization+'\nИНН: '+customer.inn+'\nДоставка: '+order.delivery+'\nАдрес: '+customer.address+'\nКомментарий: '+order.comment;
      const mail='mailto:xxx@xxx.xxx?subject='+encodeURIComponent('Новый заказ '+number)+'&body='+encodeURIComponent(body);

      document.querySelector('[data-checkout-panel]').hidden=true;
      renderCart();
      const success=document.querySelector('[data-order-success]');
      if(success){
        success.hidden=false;
        const note=remoteSaved
          ? 'Заказ сохранён в общей системе и доступен менеджеру. Номер заказа также сохранён в вашем личном кабинете на этом устройстве.'
          : 'Заказ сохранён в личном кабинете на этом устройстве. Общая серверная база пока не подключена.';
        const actions=remoteSaved
          ? '<div class="order-success-actions"><a class="button button-gold" href="account.html">Открыть личный кабинет</a><a class="button" href="catalog.html">Продолжить покупки</a></div>'
          : '<div class="order-success-actions"><a class="button button-gold" href="'+mail+'">Отправить заказ менеджеру</a><a class="button" href="account.html">Открыть личный кабинет</a></div>';
        success.innerHTML='<h2>Заказ '+esc(number)+' оформлен</h2><p>'+note+'</p>'+actions;
      }
    });
  }

  function renderAccount(){
    const root=document.querySelector('[data-account-page]');if(!root)return;

    const normalizeIdentifier=value=>{
      const raw=String(value||'').trim();
      if(raw.includes('@')) return raw.toLowerCase();
      return raw.replace(/\D/g,'');
    };
    const isValidIdentifier=value=>{
      const raw=String(value||'').trim();
      if(raw.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
      return raw.replace(/\D/g,'').length>=10;
    };
    const statusSteps=['Заказ принят','Подтверждён','В производстве','Готов','Отправлен','Получен'];
    const statusIndex=status=>{
      const raw=String(status||'').toLowerCase();
      if(raw.includes('получ')) return 5;
      if(raw.includes('отправ')||raw.includes('достав')) return 4;
      if(raw.includes('готов')) return 3;
      if(raw.includes('производ')) return 2;
      if(raw.includes('подтверж')) return 1;
      return 0;
    };
    const friendlyStatus=status=>statusSteps[statusIndex(status)];

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

      const code=String(Math.floor(100000+Math.random()*900000));
      sessionStorage.setItem(AUTH_PENDING_KEY,JSON.stringify({identifier,code,createdAt:Date.now(),remote:false}));
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

    function renderOrder(order){
      const active=statusIndex(order.status);
      const steps=statusSteps.map((label,index)=>{
        const cls=index<active?' done':index===active?' active':'';
        return '<div class="account-status-step'+cls+'">'+esc(label)+'</div>';
      }).join('');
      const items=(order.items||[]).map(item=>
        '<div class="account-order-item"><div><strong>'+esc(item.title)+'</strong><br><small>'+esc(item.size)+' · '+(Number(item.qty)||1)+' шт.</small></div><span>'+money((Number(item.price)||0)*(Number(item.qty)||1))+'</span></div>'
      ).join('');
      return '<article class="account-order-v2">'+
        '<div class="account-order-top"><div><h3 class="account-order-number">'+esc(order.number)+'</h3><p class="account-order-meta">'+new Date(order.date).toLocaleString('ru-RU')+' · '+(order.items||[]).length+' поз.</p></div><span class="account-order-status-v2">'+esc(friendlyStatus(order.status))+'</span></div>'+
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

      const all=visibleOrdersFor(state.identifier);
      const count=root.querySelector('[data-account-order-count]');if(count)count.textContent=all.length;
      const total=root.querySelector('[data-account-order-total]');if(total)total.textContent=money(all.reduce((sum,o)=>sum+(Number(o.total)||0),0));
      const cartN=root.querySelector('[data-account-cart-count]');if(cartN)cartN.textContent=cartCount();

      const ordersHost=root.querySelector('[data-account-orders]');
      if(ordersHost){
        ordersHost.innerHTML=all.length
          ? all.map(renderOrder).join('')
          : '<div class="account-empty-v2"><strong>Заказов пока нет</strong><p>Заказы, оформленные на этот телефон или e-mail, появятся здесь.</p><a class="button button-gold" href="catalog.html">Перейти в каталог</a></div>';
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
            demoBox.hidden=false;
            demoBox.innerHTML='<strong>Тестовый режим:</strong> код для входа — <b>'+esc(result.code)+'</b>. После подключения сервиса этот код будет приходить по SMS или e-mail.';
          }else{
            demoBox.hidden=true;
          }
        }
        verifyForm?.elements.code?.focus();
      }catch(error){
        const message=error?.message||'Не удалось отправить код. Попробуйте ещё раз.';
        toast('<strong>Вход в кабинет</strong><br>'+esc(message));
        if(error?.retryMs&&button){
          let left=Math.max(1,Math.ceil(error.retryMs/1000));
          button.disabled=true;
          button.textContent='Повторить через '+left+' сек.';
          const timer=setInterval(()=>{
            left--;
            if(left<=0){
              clearInterval(timer);
              button.disabled=false;
              button.textContent='Получить код';
            }else{
              button.textContent='Повторить через '+left+' сек.';
            }
          },1000);
          return;
        }
      }finally{
        if(button&&!button.disabled){button.disabled=false;button.textContent='Получить код'}
      }
    });

    verifyForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const identifier=verifyForm.dataset.identifier||'';
      const code=String(new FormData(verifyForm).get('code')||'').trim();
      if(errorBox)errorBox.hidden=true;
      const ok=await verifyCode(identifier,code);
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
  renderCart();
  initCheckout();
  renderAccount();
  window.addEventListener('storage',()=>{updateHeaderCount();renderCart();renderAccount()});
})();
