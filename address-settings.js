(() => {
  const KEY='derzhava_dadata_test_token_v1',BUDGET='derzhava_dadata_test_count_v1';
  const form=document.getElementById('keyForm'),input=document.getElementById('apiKey'),state=document.getElementById('state'),disconnect=document.getElementById('disconnect');
  function show(){try{state.textContent=sessionStorage.getItem(KEY)?'Ключ сохранён для этой вкладки. Откройте корзину в этой же вкладке; доступность проверится при вводе адреса.':'Подсказки отключены. Введите API-ключ.';}catch(_){state.textContent='Хранилище браузера недоступно.';}}
  form.addEventListener('submit',e=>{e.preventDefault();const token=input.value.trim();if(!/^[A-Za-z0-9_-]{16,160}$/.test(token)){state.textContent='Проверьте API-ключ в личном кабинете DaData.';return;}try{sessionStorage.setItem(KEY,token);input.value='';show();}catch(_){state.textContent='Не удалось сохранить ключ.';}});
  disconnect.addEventListener('click',()=>{try{sessionStorage.removeItem(KEY);sessionStorage.removeItem(BUDGET);input.value='';show();}catch(_){state.textContent='Не удалось отключить ключ.';}});
  show();
})();