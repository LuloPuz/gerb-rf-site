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
  const logout = find('[data-server-logout]');
  const greeting = find('[data-server-greeting]');
  const profile = find('[data-server-profile]');
  const fields = find('[data-profile-fields]');
  const profilePanel = find('[data-server-panel="profile"]');
  const profileMessage = find('[data-profile-message]');
  const profileRetry = find('[data-profile-retry]');
  const addresses = find('[data-profile-addresses]');
  const addAddress = find('[data-profile-add]');
  const phone = find('[data-profile-phone]');
  const email = find('[data-profile-email]');
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
    dashboard.hidden = true;
    greeting.textContent = '';
    clearProfile();
  }
  function showGate(text) {
    hideAccount();
    gate.hidden = false;
    login.hidden = !canonical;
    find('[data-canonical-login]').hidden = canonical;
    retry.hidden = true;
    status(text);
  }
  function unavailable(text) {
    hideAccount();
    gate.hidden = true;
    retry.hidden = false;
    status(text);
  }
  async function refresh(initial = false) {
    if (!canonical) { showGate('Для входа используйте основной защищённый домен.'); return; }
    if (loggingOut || pending) return;
    pending = true;
    const current = ++generation;
    gate.hidden = true;
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
      status('');
      if (!profilePanel.hidden) loadProfile();
    } catch {
      if (current === generation) unavailable('Не удалось проверить авторизацию. Повторите проверку.');
    } finally { if (current === generation) pending = false; }
  }
  retry.addEventListener('click', () => refresh());
  login.addEventListener('submit', () => {
    login.querySelector('button').disabled = true;
  });
  logout.addEventListener('click', async () => {
    if (loggingOut || profileBusy && profileLoaded) return;
    loggingOut = true;
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
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => {
      item.classList.toggle('active', item === tab);
      item.setAttribute('aria-pressed', String(item === tab));
    });
    panels.forEach(panel => panel.hidden = panel.dataset.serverPanel !== tab.dataset.serverTab);
    if (tab.dataset.serverTab === 'profile' && !profileLoaded) loadProfile();
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
    phone.textContent = 'Не подтверждён';
    email.textContent = 'Не подтверждена';
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
      (p.email === null || typeof p.email === 'string');
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
      phone.textContent = p.phone || 'Не подтверждён';
      email.textContent = p.email || 'Не подтверждена';
      addresses.replaceChildren();
      p.addresses.forEach(a => appendAddress(a));
      syncAddresses();
      profileLoaded = true;
      dirty = false;
      profile.hidden = false;
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
  profile.addEventListener('submit', async event => {
    event.preventDefault();
    if (!profileLoaded || profileBusy || loggingOut || dashboard.hidden) return;
    const payload = {
      name: profile.elements.name.value.trim(),
      organization: profile.elements.organization.value.trim(),
      inn: profile.elements.inn.value.trim(),
      addresses: [...addresses.querySelectorAll('input')].map(input => input.value.trim())
    };
    if (!payload.name || payload.addresses.some(a => !a)) {
      profileStatus('Заполните имя и добавленные адреса или удалите пустые строки.');
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
      if (response.status === 400) { profileStatus('Проверьте имя, ИНН и длину адресов.'); return; }
      if (!response.ok || (await response.json()).saved !== true) throw Error('Save unavailable');
      if (current !== profileRequest) return;
      profile.elements.name.value = payload.name;
      profile.elements.organization.value = payload.organization;
      profile.elements.inn.value = payload.inn;
      [...addresses.querySelectorAll('input')].forEach((input, i) => input.value = payload.addresses[i]);
      greeting.textContent = 'Здравствуйте, ' + payload.name;
      dirty = false;
      profileStatus('Изменения сохранены.');
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
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });
  // Do not retain a visible identity in back/forward cache.
  window.addEventListener('pagehide', () => { generation++; pending = false; hideAccount(); });
  window.addEventListener('pageshow', event => {
    login.querySelector('button').disabled = false;
    if (event.persisted) refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !loggingOut && !profileBusy) {
      if (dirty) { profileStatus('Есть несохранённые изменения. Сохранение снова проверит серверную сессию.'); return; }
      refresh();
    }
  });
  refresh(true);
})();
