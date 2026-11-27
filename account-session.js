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
  const name = find('[data-server-name]');
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
    name.textContent = 'Не указано';
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
      name.textContent = displayName || 'Не указано';
      dashboard.hidden = false;
      status('');
    } catch {
      if (current === generation) unavailable('Не удалось проверить авторизацию. Повторите проверку.');
    } finally { if (current === generation) pending = false; }
  }
  retry.addEventListener('click', () => refresh());
  login.addEventListener('submit', () => {
    login.querySelector('button').disabled = true;
  });
  logout.addEventListener('click', async () => {
    if (loggingOut) return;
    loggingOut = true;
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
  }));
  // Do not retain a visible identity in back/forward cache.
  window.addEventListener('pagehide', () => { generation++; pending = false; hideAccount(); });
  window.addEventListener('pageshow', event => {
    login.querySelector('button').disabled = false;
    if (event.persisted) refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !loggingOut) refresh();
  });
  refresh(true);
})();
