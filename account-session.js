(() => {
  'use strict';
  const root = document.querySelector('[data-server-account]');
  if (!root) return;
  const find = selector => root.querySelector(selector);
  const gate = find('[data-server-gate]');
  const dashboard = find('[data-server-dashboard]');
  const message = find('[data-session-message]');
  const retry = find('[data-session-retry]');
  const login = find('[data-server-login]');
  const loginButton=login.querySelector('button');
  const consentControls=find('[data-consent-controls]');
  const consentPreview=find('[data-consent-preview]');
  const consentCheck=find('#account-consent-check');
  const consentVersion=find('[data-consent-version]');
  const consentError=find('[data-consent-error]');
  const consentRetry=find('[data-consent-retry]');
  let consentReady=false,consentRequired=false,consentGeneration=0;
  const logout = find('[data-server-logout]');
  const withdrawalPanel=find('[data-withdrawal-panel]');
  const withdrawalOpen=find('[data-withdrawal-open]');
  const withdrawalStatus=find('[data-withdrawal-status]');
  const withdrawalDialog=document.querySelector('[data-withdrawal-dialog]');
  const withdrawalConfirm=withdrawalDialog.querySelector('[data-withdrawal-confirm]');
  const withdrawalCancel=withdrawalDialog.querySelector('[data-withdrawal-cancel]');
  const withdrawalDialogStatus=withdrawalDialog.querySelector('[data-withdrawal-dialog-status]');
  let activeSessionMarker=null,withdrawalBusy=false,withdrawalReady=false;
  function clearWithdrawal(){
    activeSessionMarker=null;withdrawalReady=false;withdrawalPanel.hidden=true;
    withdrawalStatus.hidden=true;withdrawalStatus.textContent='';
    if(!withdrawalBusy&&withdrawalDialog.open)withdrawalDialog.close();
  }
  async function loadWithdrawal(marker,current){
    if(typeof marker!=='string'||!/^[a-f0-9]{64}$/.test(marker))return;
    try{
      const r=await fetch('/api/auth/consent',{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!r.ok)return;
      const p=await r.json();
      if(current!==generation||dashboard.hidden||p.enforced!==true)return;
      activeSessionMarker=marker;withdrawalReady=true;withdrawalPanel.hidden=false;
    }catch{}
  }
  withdrawalOpen.addEventListener('click',()=>{
    if(!withdrawalReady||!activeSessionMarker||withdrawalBusy||dashboard.hidden||profileBusy)return;
    withdrawalDialogStatus.hidden=true;withdrawalDialogStatus.textContent='';
    withdrawalDialog.showModal();
  });
  withdrawalCancel.addEventListener('click',()=>{if(!withdrawalBusy)withdrawalDialog.close()});
  withdrawalDialog.addEventListener('cancel',e=>{if(withdrawalBusy)e.preventDefault()});
  withdrawalConfirm.addEventListener('click',async()=>{
    if(!withdrawalReady||!activeSessionMarker||withdrawalBusy||dashboard.hidden)return;
    const marker=activeSessionMarker;
    withdrawalBusy=true;withdrawalConfirm.disabled=true;withdrawalCancel.disabled=true;
    withdrawalDialogStatus.hidden=true;
    try{
      const r=await fetch('/api/auth/consent/withdraw',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
        headers:{'X-Session-Marker':marker,'X-Confirm-Withdrawal':'yes'},signal:AbortSignal.timeout(15000)});
      if(r.status===409||r.status===401){
        withdrawalDialog.close();
        withdrawalBusy=false;
        await refresh();
        status('Не удалось подтвердить запрос. Проверьте текущую учётную запись.');
        return;
      }
      if(r.status!==204)throw Error();
      dirty=false;withdrawalDialog.close();generation++;pending=false;
      showGate('Запрос на отзыв согласия принят. Доступ к личному кабинету закрыт. Для вопросов: primesandal@yandex.ru.');
    }catch{
      withdrawalDialogStatus.textContent='Не удалось подтвердить приём запроса. Проверьте состояние аккаунта или обратитесь по адресу primesandal@yandex.ru.';
      withdrawalDialogStatus.hidden=false;
    }finally{withdrawalBusy=false;withdrawalConfirm.disabled=false;withdrawalCancel.disabled=false;}
  });
  const greeting = find('[data-server-greeting]');
  const profile = find('[data-server-profile]');
  const fields = find('[data-profile-fields]');
  const profilePanel = find('[data-server-panel="profile"]');
  const profileMessage = find('[data-profile-message]');
  const profileRetry = find('[data-profile-retry]');
  const addresses = find('[data-profile-addresses]');
  const addAddress = find('[data-profile-add]');
  const nav = find('[data-server-nav]');
  const layout = find('[data-server-layout]');
  const profileTitle = find('[data-profile-title]');
  const profileIntro = find('[data-profile-intro]');
  const saveButton = find('[data-profile-save]');
  const extras = [...root.querySelectorAll('[data-profile-extra]')];
  const ordersList=find('[data-orders-list]');
  const ordersStatus=find('[data-orders-status]');
  const ordersMore=find('[data-orders-more]');
  const ordersRetry=find('[data-orders-retry]');
  let orderGeneration=0, ordersBusy=false, ordersLoaded=false, nextBefore=null;
  let completing = false;
  let selectedTab = 'orders';
  let profileRequest = 0, profileBusy = false, profileLoaded = false, dirty = false;
  const canonical = location.origin === 'https://gerbrf.ru';
  let generation = 0, loggingOut = false, pending = false;
  const url = new URL(location.href);
  const outcome = url.searchParams.get('auth');
  if (url.searchParams.has('auth') || url.searchParams.has('test')) {
    url.searchParams.delete('auth');
    url.searchParams.delete('test');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function status(text) {
    message.textContent = text || '';
    message.hidden = !text;
  }
  function hideAccount() {
    clearWithdrawal();
    dashboard.hidden = true;
    greeting.textContent = '';
    clearProfile();
    clearOrders();
  }
  function consentStatus(text) {
    consentError.textContent=text||'';
    consentError.hidden=!text;
  }
  function resetConsent(){
    consentGeneration++;
    consentReady=false;consentRequired=false;
    loginButton.disabled=true;
    consentControls.hidden=true;
    consentCheck.checked=false;consentCheck.disabled=true;
    consentCheck.removeAttribute('aria-invalid');
    consentVersion.disabled=true;consentVersion.value='';
    consentRetry.hidden=true;
    consentStatus('');
  }
  async function loadConsent(){
    resetConsent();
    const current=consentGeneration;
    if(!canonical)return;
    consentPreview.hidden=false;
    try{
      const response=await fetch('/api/auth/consent',{credentials:'omit',cache:'no-store',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error();
      const p=await response.json();
      if(current!==consentGeneration||gate.hidden)return;
      if(p.enforced===false&&p.version===null&&p.sha256===null){
        consentReady=true;loginButton.disabled=false;return;
      }
      if(p.enforced!==true||typeof p.version!=='string'||!p.version||
         typeof p.sha256!=='string'||!/^[a-f0-9]{64}$/.test(p.sha256)||
         p.version!==consentControls.dataset.documentVersion||
         p.sha256!==consentControls.dataset.documentSha256)throw Error();
      // Only an explicitly released, matching local document may be accepted.
      consentRequired=true;consentReady=true;consentVersion.value=p.version;
      consentCheck.disabled=false;consentVersion.disabled=false;
      consentControls.hidden=false;consentPreview.hidden=true;loginButton.disabled=false;
    }catch{
      if(current!==consentGeneration||gate.hidden)return;
      consentPreview.hidden=true;
      consentStatus('Не удалось проверить актуальную версию условий входа. Повторите проверку.');
      consentRetry.hidden=false;
    }
  }
  consentRetry.addEventListener('click',loadConsent);
  consentCheck.addEventListener('change',()=>{
    consentCheck.removeAttribute('aria-invalid');
    consentStatus('');
  });
  function showGate(text) {
    hideAccount();
    gate.hidden = false;
    login.hidden = !canonical;
    find('[data-canonical-login]').hidden = canonical;
    retry.hidden = true;
    status(text);
    loadConsent();
  }
  function unavailable(text) {
    hideAccount();
    gate.hidden = true;
    resetConsent();
    retry.hidden = false;
    status(text);
  }
  async function refresh(initial = false) {
    if (!canonical) { showGate('Для входа используйте основной защищённый домен.'); return; }
    if (loggingOut || pending || withdrawalBusy) return;
    pending = true;
    const current = ++generation;
    gate.hidden = true;
    resetConsent();
    hideAccount();
    retry.hidden = true;
    status('Проверяем авторизацию…');
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        redirect: 'error', headers: {Accept: 'application/json'},
        signal: AbortSignal.timeout(12000)
      });
      if (current !== generation) return;
      if (response.status === 401) {
        showGate(initial && outcome === 'yandex_error'
          ? 'Не удалось войти через Яндекс. Попробуйте ещё раз.'
          : initial && outcome === 'yandex_success'
            ? 'Не удалось подтвердить серверную сессию. Попробуйте войти снова.'
            : '');
        return;
      }
      if (!response.ok) throw Error('Session unavailable');
      const data = await response.json();
      if (current !== generation) return;
      if (data.authenticated !== true || !Number.isFinite(Date.parse(data.expiresAt)) ||
          Date.parse(data.expiresAt) <= Date.now()) throw Error('Invalid session response');
      const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
      greeting.textContent = displayName ? 'Здравствуйте, ' + displayName : 'Добро пожаловать';

      dashboard.hidden = false;
      loadWithdrawal(data.sessionMarker,current);
      status('');
      showProfileLoading();
      loadProfile();
    } catch {
      if (current === generation) unavailable('Не удалось проверить авторизацию. Повторите проверку.');
    } finally { if (current === generation) pending = false; }
  }
  retry.addEventListener('click', () => refresh());
  login.addEventListener('submit', event => {
    if(!consentReady || (consentRequired && !consentCheck.checked)){
      event.preventDefault();
      if(consentRequired){
        consentCheck.setAttribute('aria-invalid','true');
        consentStatus('Подтвердите согласие, чтобы продолжить вход.');
        consentCheck.focus();
      }
      return;
    }
    loginButton.disabled=true;
  });
  logout.addEventListener('click', async () => {
    if (loggingOut || profileBusy && profileLoaded) return;
    loggingOut = true;
    clearOrders();
    clearProfile();
    generation++;
    pending = false;
    logout.disabled = true;
    status('Завершаем сеанс…');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        redirect: 'error', signal: AbortSignal.timeout(12000)
      });
      if (response.status !== 204) throw Error('Logout unavailable');
      showGate('Вы вышли из личного кабинета.');
    } catch {
      unavailable('Не удалось подтвердить выход. Повторите проверку и при необходимости выйдите ещё раз.');
    } finally { loggingOut = false; logout.disabled = false; }
  });
  const tabs = [...root.querySelectorAll('[data-server-tab]')];
  const panels = [...root.querySelectorAll('[data-server-panel]')];
  function selectTab(key) {
    selectedTab = key;
    tabs.forEach(item => {
      const active = item.dataset.serverTab === key;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    panels.forEach(panel => panel.hidden = panel.dataset.serverPanel !== key);
    if(key==='orders'&&profileLoaded&&!completing&&!ordersLoaded)loadOrders();
  }
  function showProfileLoading() {
    nav.hidden = true;
    layout.classList.add('profile-completing');
    panels.forEach(panel => panel.hidden = panel !== profilePanel);
  }
  function setCompletion(value) {
    completing = value;
    nav.hidden = value;
    layout.classList.toggle('profile-completing', value);
    profileTitle.textContent = value ? 'Завершите регистрацию' : 'Мои данные';
    profileIntro.textContent = value
      ? 'Укажите имя и телефон для связи по заказам. Пока сайт тестируется, используйте вымышленные данные.'
      : 'Личные данные, реквизиты и адреса доставки. В тестовом режиме используйте вымышленные данные.';
    extras.forEach(el => el.hidden = value);
    saveButton.textContent = value ? 'Завершить регистрацию' : 'Сохранить изменения';
    selectTab(value ? 'profile' : selectedTab);
  }
  tabs.forEach(tab => tab.addEventListener('click', () => {
    if (!profileLoaded || completing) return;
    selectTab(tab.dataset.serverTab);
  }));
  function profileStatus(text) {
    profileMessage.textContent = text || '';
    profileMessage.hidden = !text;
  }
  function clearProfile() {
    profileRequest++;
    profileBusy = false;
    profileLoaded = false;
    dirty = false;
    profile.reset();
    fields.disabled = false;
    profile.hidden = true;
    profileRetry.hidden = true;
    addresses.replaceChildren();
    completing = false;
    nav.hidden = true;
    profileTitle.textContent = 'Мои данные';
    extras.forEach(el => el.hidden = false);
    profileStatus('');
    logout.disabled = loggingOut;
  }
  function syncAddresses() {
    const rows = [...addresses.querySelectorAll('.profile-address')];
    rows.forEach((row, i) => {
      row.querySelector('span').textContent = 'Адрес ' + (i + 1);
      row.querySelector('button').setAttribute('aria-label', 'Удалить адрес ' + (i + 1));
    });
    addAddress.disabled = rows.length >= 5;
  }
  function appendAddress(value = '') {
    if (addresses.children.length >= 5) return;
    const row = document.createElement('div');
    row.className = 'profile-address';
    const label = document.createElement('label');
    label.className = 'account-auth-field';
    const caption = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 300;
    input.required = true;
    input.value = value;
    input.placeholder = 'Город, улица, дом';
    label.append(caption, input);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'account-signout';
    remove.textContent = 'Удалить';
    remove.addEventListener('click', () => { row.remove(); dirty = true; syncAddresses(); });
    row.append(label, remove);
    addresses.append(row);
    syncAddresses();
    return input;
  }
  function validProfile(p) {
    return p && typeof p.name === 'string' && typeof p.organization === 'string' &&
      typeof p.inn === 'string' && Array.isArray(p.addresses) && p.addresses.length <= 5 &&
      p.addresses.every(a => typeof a === 'string') &&
      (p.phone === null || typeof p.phone === 'string') &&
      (p.email === null || typeof p.email === 'string') &&
      (p.contactPhone === null || typeof p.contactPhone === 'string') &&
      (p.contactEmail === null || typeof p.contactEmail === 'string') &&
      typeof p.registrationComplete === 'boolean';
  }
  async function loadProfile() {
    if (dashboard.hidden || loggingOut || profileBusy || profileLoaded) return;
    const current = ++profileRequest;
    profileBusy = true;
    profile.hidden = true;
    profileRetry.hidden = true;
    profileStatus('Загружаем данные…');
    try {
      const response = await fetch('/api/account/profile', {
        credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: {Accept:'application/json'}, signal: AbortSignal.timeout(12000)
      });
      if (current !== profileRequest) return;
      if (response.status === 401) { showGate('Сессия завершена. Войдите снова.'); return; }
      if (!response.ok) throw Error('Profile unavailable');
      const p = await response.json();
      if (current !== profileRequest) return;
      if (!validProfile(p)) throw Error('Invalid profile response');
      profile.elements.name.value = p.name;
      profile.elements.organization.value = p.organization;
      profile.elements.inn.value = p.inn;
      profile.elements.contactPhone.value = p.contactPhone || '';
      profile.elements.contactEmail.value = p.contactEmail || '';
      addresses.replaceChildren();
      p.addresses.forEach(a => appendAddress(a));
      syncAddresses();
      profileLoaded = true;
      dirty = false;
      profile.hidden = false;
      setCompletion(!p.registrationComplete);
      profileStatus('');
    } catch {
      if (current === profileRequest) {
        profileRetry.hidden = false;
        profileStatus('Не удалось загрузить данные. Попробуйте ещё раз.');
      }
    } finally { if (current === profileRequest) profileBusy = false; }
  }
  profileRetry.addEventListener('click', loadProfile);
  profile.addEventListener('input', () => { dirty = true; });
  addAddress.addEventListener('click', () => { dirty = true; appendAddress()?.focus(); });
  function normalizePhone(value) {
    const raw = value.trim();
    if (!/^[+0-9 ()-]+$/.test(raw)) return '';
    let digits = raw.replace(/\D/g,'');
    if (digits.length === 10 && !raw.startsWith('+')) digits = '7' + digits;
    if (digits.length === 11 && digits.startsWith('8') && !raw.startsWith('+')) digits = '7' + digits.slice(1);
    return '+' + digits;
  }
  profile.addEventListener('submit', async event => {
    event.preventDefault();
    if (!profileLoaded || profileBusy || loggingOut || dashboard.hidden) return;
    const payload = {
      name: profile.elements.name.value.trim(),
      organization: profile.elements.organization.value.trim(),
      inn: profile.elements.inn.value.trim(),
      addresses: [...addresses.querySelectorAll('input')].map(input => input.value.trim()),
      contactPhone: normalizePhone(profile.elements.contactPhone.value),
      contactEmail: profile.elements.contactEmail.value.trim() || null
    };
    if (!payload.name || payload.addresses.some(a => !a)) {
      profileStatus('Заполните имя и добавленные адреса или удалите пустые строки.');
      return;
    }
    if (!/^\+[1-9][0-9]{6,14}$/.test(payload.contactPhone)) {
      profileStatus('Введите корректный номер телефона, например +7 000 000-00-00.');
      return;
    }
    const current = ++profileRequest;
    profileBusy = true;
    fields.disabled = true;
    logout.disabled = true;
    profileStatus('Сохраняем данные…');
    try {
      const response = await fetch('/api/account/profile', {
        method:'PUT', credentials:'same-origin', cache:'no-store', redirect:'error',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(payload), signal:AbortSignal.timeout(12000)
      });
      if (current !== profileRequest) return;
      if (response.status === 401) { showGate('Сессия завершена. Войдите снова.'); return; }
      if (response.status === 400) { profileStatus('Проверьте имя, телефон, почту, ИНН и адреса.'); return; }
      if (!response.ok || (await response.json()).saved !== true) throw Error('Save unavailable');
      if (current !== profileRequest) return;
      profile.elements.name.value = payload.name;
      profile.elements.organization.value = payload.organization;
      profile.elements.inn.value = payload.inn;
      [...addresses.querySelectorAll('input')].forEach((input, i) => input.value = payload.addresses[i]);
      profile.elements.contactPhone.value = payload.contactPhone;
      profile.elements.contactEmail.value = payload.contactEmail || '';
      greeting.textContent = 'Здравствуйте, ' + payload.name;
      dirty = false;
      const wasCompleting = completing;
      setCompletion(false);
      profileStatus(wasCompleting ? 'Регистрация завершена. Контакты сохранены.' : 'Изменения сохранены.');
    } catch {
      if (current === profileRequest) profileStatus('Не удалось подтвердить сохранение. Повторите попытку.');
    } finally {
      if (current === profileRequest) {
        profileBusy = false;
        fields.disabled = false;
        logout.disabled = false;
        syncAddresses();
      }
    }
  });
  function clearOrders(){
    orderGeneration++;ordersBusy=false;ordersLoaded=false;nextBefore=null;
    ordersList.replaceChildren();ordersMore.hidden=true;ordersRetry.hidden=true;
    ordersStatus.textContent='Загружаем заказы…';
  }
  function node(tag,cls,text){
    const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
  }
  const rub=value=>new Intl.NumberFormat('ru-RU').format(value)+' ₽';
  function validOrder(o){
    return o&&typeof o.number==='string'&&/^[1-9]\d*$/.test(o.number)&&typeof o.status==='string'&&
      Number.isSafeInteger(o.total)&&o.total>0&&Number.isFinite(Date.parse(o.createdAt))&&Array.isArray(o.items)&&
      o.items.length<=50&&o.items.every(i=>i&&typeof i.title==='string'&&typeof i.sku==='string'&&
        typeof i.size==='string'&&typeof i.finish==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&Number.isSafeInteger(i.price)&&i.price>0);
  }
  function renderOrder(o){
    const card=node('article','server-order-card'),head=node('div','server-order-head'),info=node('div','');
    info.append(node('h3','','Заказ ДРЖ-'+o.number),node('p','server-order-meta',new Date(o.createdAt).toLocaleDateString('ru-RU')));
    head.append(info,node('span','server-order-status',o.status));card.append(head);
    o.items.forEach(i=>{
      const row=node('div','server-order-item'),details=node('div','');
      details.append(node('strong','',i.title),node('p','server-order-meta',[i.sku?'Арт. '+i.sku:'',i.size,i.finish].filter(Boolean).join(' · ')),node('p','server-order-meta',i.quantity+' шт. × '+rub(i.price)));
      try{
        const url=new URL(i.image,location.href);
        if(i.image&&url.origin===location.origin&&/\.(png|jpe?g|webp)$/i.test(url.pathname)){
          const img=node('img','server-order-image');img.src=url.pathname+url.search;img.alt='';img.loading='lazy';row.append(img);
        }
      }catch{}
      row.append(details,node('strong','server-order-price',rub(i.quantity*i.price)));card.append(row);
    });
    const total=node('div','server-order-total');total.append(node('span','','Стоимость товаров'),node('strong','',rub(o.total)));card.append(total);
    return card;
  }
  async function loadOrders(more=false){
    if(ordersBusy||loggingOut||dashboard.hidden||completing||!profileLoaded)return;
    if(more&&!nextBefore)return;
    const current=++orderGeneration;ordersBusy=true;ordersMore.hidden=true;ordersRetry.hidden=true;
    ordersStatus.textContent='Загружаем заказы…';
    try{
      const path='/api/account/orders'+(more?'?before='+encodeURIComponent(nextBefore):'');
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
      if(current!==orderGeneration)return;
      if(response.status===401){showGate('Сессия завершена. Войдите снова.');return;}
      if(!response.ok)throw Error();
      const data=await response.json();
      if(current!==orderGeneration)return;
      if(data.authenticated!==true||!Array.isArray(data.orders)||data.orders.length>20||
         !data.orders.every(validOrder)||!(data.nextBefore===null||typeof data.nextBefore==='string'&&/^[1-9]\d*$/.test(data.nextBefore)))throw Error();
      if(!more)ordersList.replaceChildren();
      data.orders.forEach(o=>ordersList.append(renderOrder(o)));
      nextBefore=data.nextBefore;ordersLoaded=true;
      ordersMore.hidden=!nextBefore;
      ordersStatus.textContent=ordersList.children.length?'':'У вас пока нет заказов. Выберите товар в каталоге.';
    }catch{
      if(current===orderGeneration){ordersStatus.textContent='Не удалось загрузить заказы. Повторите попытку.';ordersRetry.hidden=false;}
    }finally{if(current===orderGeneration)ordersBusy=false;}
  }
  ordersMore.addEventListener('click',()=>loadOrders(true));
  ordersRetry.addEventListener('click',()=>loadOrders(ordersLoaded&&!!nextBefore));
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  // Do not retain a visible identity in back/forward cache.
  window.addEventListener('pagehide', () => { generation++; pending = false; resetConsent(); hideAccount(); });
  window.addEventListener('pageshow', event => {
    if(event.persisted)refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !loggingOut && !profileBusy) {
      if (dirty) { profileStatus('Есть несохранённые изменения. Сохранение снова проверит серверную сессию.'); return; }
      refresh();
    }
  });
  refresh(true);
})();
