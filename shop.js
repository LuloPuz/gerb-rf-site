
(() => {
  const CART_KEY='derzhava_cart_v1';
  const PROFILE_KEY='derzhava_profile_v1';
  const ORDERS_KEY='derzhava_orders_v1';

  const money=n=>new Intl.NumberFormat('ru-RU').format(Number(n)||0)+' ₽';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const cart=()=>read(CART_KEY,[]);
  const profile=()=>read(PROFILE_KEY,{name:'',phone:'',email:'',organization:'',inn:'',address:''});
  const orders=()=>read(ORDERS_KEY,[]);
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
    document.querySelectorAll('[data-cart-count]').forEach(el=>{
      const n=cartCount();el.textContent=n;el.dataset.empty=String(n===0);
    });
  }

  function injectHeader(){
    document.querySelectorAll('.header-inner').forEach(header=>{
      if(header.querySelector('.shop-header-actions')) return;
      const actions=document.createElement('div');
      actions.className='shop-header-actions';
      actions.innerHTML=
        '<a class="shop-header-link" href="account.html" aria-label="Личный кабинет" title="Личный кабинет">'+
          '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"></path></svg>'+
        '</a>'+
        '<a class="shop-header-link" href="cart.html" aria-label="Корзина" title="Корзина">'+
          '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 8H6.2"></path><circle cx="10" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle></svg>'+
          '<span class="shop-cart-count" data-cart-count data-empty="true">0</span>'+
        '</a>';
      const cta=header.querySelector('.header-cta');
      if(cta) header.insertBefore(actions,cta); else header.appendChild(actions);
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
    direct.textContent='Заказать напрямую у менеджера';

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
      summary.innerHTML='<h2>Ваш заказ</h2><div class="summary-row"><span>Товаров</span><strong>0</strong></div><div class="summary-total"><span>Итого</span><strong>0 ₽</strong></div>';
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
      checkout.hidden=false;fillCheckout();checkout.scrollIntoView({behavior:'smooth',block:'start'});
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
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const items=cart();if(!items.length)return;
      const fd=new FormData(form);
      const customer={name:String(fd.get('name')||''),phone:String(fd.get('phone')||''),email:String(fd.get('email')||''),organization:String(fd.get('organization')||''),inn:String(fd.get('inn')||''),address:String(fd.get('address')||'')};
      write(PROFILE_KEY,customer);
      const now=new Date();
      const number='ДРЖ-'+String(Date.now()).slice(-7);
      const order={number,date:now.toISOString(),status:'Новый',items,total:cartTotal(),customer,delivery:String(fd.get('delivery')||''),comment:String(fd.get('comment')||'')};
      const all=orders();all.unshift(order);write(ORDERS_KEY,all);setCart([]);

      const lines=order.items.map(x=>'• '+x.title+' — '+x.size+' × '+x.qty+' = '+money(x.price*x.qty)).join('\n');
      const body='Заказ '+number+'\n\n'+lines+'\n\nИтого: '+money(order.total)+'\n\nПокупатель: '+customer.name+'\nТелефон: '+customer.phone+'\nEmail: '+customer.email+'\nОрганизация: '+customer.organization+'\nИНН: '+customer.inn+'\nДоставка: '+order.delivery+'\nАдрес: '+customer.address+'\nКомментарий: '+order.comment;
      const mail='mailto:xxx@xxx.xxx?subject='+encodeURIComponent('Новый заказ '+number)+'&body='+encodeURIComponent(body);

      document.querySelector('[data-checkout-panel]').hidden=true;
      renderCart();
      const success=document.querySelector('[data-order-success]');
      if(success){
        success.hidden=false;
        success.innerHTML='<h2>Заказ '+esc(number)+' оформлен</h2><p>Он сохранён в вашем кабинете на этом устройстве. Для передачи заказа менеджеру откройте подготовленное письмо.</p><div class="order-success-actions"><a class="button button-gold" href="'+mail+'">Отправить заказ менеджеру</a><a class="button" href="account.html">Открыть личный кабинет</a></div>';
        success.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
  }

  function renderAccount(){
    const root=document.querySelector('[data-account-page]');if(!root)return;
    const p=profile(), all=orders();
    const count=root.querySelector('[data-account-order-count]');if(count)count.textContent=all.length;
    const total=root.querySelector('[data-account-order-total]');if(total)total.textContent=money(all.reduce((s,o)=>s+(Number(o.total)||0),0));
    const cartN=root.querySelector('[data-account-cart-count]');if(cartN)cartN.textContent=cartCount();

    const ordersHost=root.querySelector('[data-account-orders]');
    if(ordersHost){
      ordersHost.innerHTML=all.length?all.map(o=>'<article class="account-order"><div class="account-order-head"><div><h3>'+esc(o.number)+'</h3><p>'+new Date(o.date).toLocaleString('ru-RU')+' · '+o.items.length+' поз.</p></div><span class="account-order-status">'+esc(o.status)+'</span></div><div class="account-order-head" style="margin-top:12px"><p>'+esc(o.items.map(x=>x.title+' · '+x.size).join(' / '))+'</p><strong class="account-order-total">'+money(o.total)+'</strong></div></article>').join(''):'<div class="cart-empty"><strong>Заказов пока нет</strong><p>Оформленные через корзину заказы появятся здесь.</p><a class="button button-gold" href="catalog.html">Перейти в каталог</a></div>';
    }

    const form=root.querySelector('[data-profile-form]');
    if(form){
      ['name','phone','email','organization','inn','address'].forEach(k=>{if(form.elements[k])form.elements[k].value=p[k]||''});
      form.addEventListener('submit',e=>{
        e.preventDefault();const fd=new FormData(form);
        const next={};['name','phone','email','organization','inn','address'].forEach(k=>next[k]=String(fd.get(k)||''));
        write(PROFILE_KEY,next);toast('<strong>Профиль сохранён</strong><br>Данные будут подставляться при оформлении заказа.');
      });
    }

    const tabs=[...root.querySelectorAll('[data-account-tab]')];
    const panels=[...root.querySelectorAll('[data-account-panel]')];
    tabs.forEach(btn=>btn.addEventListener('click',()=>{
      tabs.forEach(x=>x.classList.toggle('active',x===btn));
      panels.forEach(p=>p.hidden=p.dataset.accountPanel!==btn.dataset.accountTab);
    }));
  }

  injectHeader();
  initProductPage();
  renderCart();
  initCheckout();
  renderAccount();
  window.addEventListener('storage',()=>{updateHeaderCount();renderCart();renderAccount()});
})();
