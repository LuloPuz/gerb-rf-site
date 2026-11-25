(() => {
  'use strict';
  const input=document.getElementById('deliveryAddress'),list=document.getElementById('addressSuggestions'),hint=document.getElementById('addressHint');
  if(!input||!list||!hint)return;
  const form=input.form, KEY='derzhava_dadata_test_token_v1', BUDGET='derzhava_dadata_test_count_v1';
  let token='';try{token=sessionStorage.getItem(KEY)||'';}catch(_){}
  const proxy=String(window.DERZHAVA_BACKEND_CONFIG?.addressSuggestUrl||'').trim();
  if(!proxy&&!token)return; // manual address entry always works
  const manual='Адрес можно указать вручную, включая квартиру или офис.';
  const endpoint=proxy||'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';
  const cache=new Map();
  let timer=null,controller=null,sequence=0,rows=[],active=-1,chosen='',composing=false,focused=false;
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
  hint.textContent='Введите город, улицу и дом — предложим варианты.';
  function close(){list.hidden=true;list.replaceChildren();rows=[];active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
  function cancel(){sequence++;clearTimeout(timer);controller?.abort();controller=null;close();}
  function choose(i){
    if(!rows[i])return;const value=rows[i].value;
    cancel();chosen=value;input.value=value;hint.textContent='Адрес выбран. При необходимости допишите квартиру или офис.';
    input.focus({preventScroll:true});
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function highlight(i){
    if(!rows.length)return;active=(i+rows.length)%rows.length;
    list.querySelectorAll('[role=option]').forEach((el,j)=>el.setAttribute('aria-selected',String(j===active)));
    const current=list.querySelector('#address-option-'+active);if(current){input.setAttribute('aria-activedescendant',current.id);current.scrollIntoView({block:'nearest'});}
  }
  function render(values){
    close();if(!focused||!values.length){hint.textContent='Подходящие адреса не найдены. '+manual;return;}
    rows=values;const fragment=document.createDocumentFragment();
    rows.forEach((row,i)=>{
      const el=document.createElement('div');el.id='address-option-'+i;el.className='address-option';el.setAttribute('role','option');el.setAttribute('aria-selected','false');el.textContent=row.value;
      el.addEventListener('pointerdown',e=>e.preventDefault());el.addEventListener('click',()=>choose(i));fragment.appendChild(el);
    });
    const credit=document.createElement('div');credit.className='address-credit';credit.textContent='Подсказки DaData';credit.setAttribute('aria-hidden','true');fragment.appendChild(credit);
    list.appendChild(fragment);list.hidden=false;input.setAttribute('aria-expanded','true');hint.textContent='Выберите подходящий вариант или продолжите ввод.';
  }
  async function request(query,id){
    if(id!==sequence||!focused)return;
    if(cache.has(query)){render(cache.get(query));return;}
    if(!proxy){
      try{const n=Number(sessionStorage.getItem(BUDGET)||0);if(n>=100){hint.textContent='Лимит тестовых подсказок исчерпан. '+manual;return;}sessionStorage.setItem(BUDGET,String(n+1));}catch(_){hint.textContent=manual;return;}
    }
    const c=new AbortController();controller=c;const timeout=setTimeout(()=>c.abort(),6000);
    hint.textContent='Ищем адрес…';
    try{
      const headers={'Content-Type':'application/json','Accept':'application/json'};
      if(!proxy)headers.Authorization='Token '+token;
      const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({query,count:6,locations:[{country:'Россия'}]}),signal:c.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const json=await response.json();if(id!==sequence||!focused)return;
      const seen=new Set();const values=(Array.isArray(json.suggestions)?json.suggestions:[]).filter(x=>typeof x?.value==='string'&&x.value.trim()&&!seen.has(x.value)&&seen.add(x.value)).slice(0,6).map(x=>({value:x.value}));
      if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(query,values);render(values);
    }catch(_){if(id===sequence&&focused){close();hint.textContent='Подсказки сейчас недоступны. '+manual;}}
    finally{clearTimeout(timeout);if(controller===c)controller=null;}
  }
  function schedule(){cancel();if(composing||!focused)return;const query=input.value.trim();if(query===chosen||query.length<3){hint.textContent=manual;return;}const id=sequence;timer=setTimeout(()=>request(query,id),400);}
  input.addEventListener('focus',()=>{focused=true;if(input.value.trim()!==chosen)schedule();});
  input.addEventListener('input',()=>{chosen='';schedule();});
  input.addEventListener('compositionstart',()=>{composing=true;cancel();});
  input.addEventListener('compositionend',()=>{composing=false;schedule();});
  input.addEventListener('blur',()=>{focused=false;cancel();});
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape'){cancel();return;}if(list.hidden)return;
    if(e.key==='ArrowDown'){e.preventDefault();highlight(active+1);}
    else if(e.key==='ArrowUp'){e.preventDefault();highlight(active<0?rows.length-1:active-1);}
    else if(e.key==='Enter'){e.preventDefault();choose(active<0?0:active);}
  });
  form?.addEventListener('submit',cancel);form?.addEventListener('reset',()=>{cancel();chosen='';hint.textContent=manual;});
  form?.querySelector('[name=delivery]')?.addEventListener('change',cancel);
})();
