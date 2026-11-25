
(() => {
  const form=document.querySelector('[data-offer-form]');
  if(!form) return;

  const method=form.elements.contact_method;
  const contactInput=form.elements.contact_value;
  const contactLabel=document.querySelector('[data-contact-label]');
  const contactHelp=document.querySelector('[data-contact-help]');
  const heraldry=form.elements.heraldry;
  const results=document.querySelector('[data-heraldry-results]');
  const customToggle=document.querySelector('[data-custom-toggle]');
  const customWrap=document.querySelector('[data-custom-wrap]');
  const customInput=form.elements.custom_heraldry;

  const entities=(window.DERZHAVA_HERALDRY_ENTITIES||[]).map(x=>({
    ...x,
    hay:(x.name+' '+x.meta+' '+(x.tokens||'')).toLowerCase().replace(/ё/g,'е')
  }));

  const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function updateContact(){
    const v=method.value;
    const email=v==='email';
    contactLabel.textContent=email?'Email для связи':'Номер телефона для связи';
    contactInput.type=email?'email':'tel';
    contactInput.placeholder=email?'name@example.ru':'+7 999 999-99-99';
    contactInput.autocomplete=email?'email':'tel';
    contactHelp.textContent=email
      ? 'Ответ и предложение отправим на указанную почту.'
      : (v==='phone'?'Позвоним на указанный номер.':'Этот номер должен быть привязан к выбранному мессенджеру.');
  }
  method.addEventListener('change',updateContact);
  updateContact();

  function normalize(s){return String(s||'').toLowerCase().replace(/ё/g,'е').trim()}
  function renderMatches(){
    const q=normalize(heraldry.value);
    if(q.length<2){results.hidden=true;results.innerHTML='';return}
    const tokens=q.split(/\s+/).filter(Boolean);
    const matches=entities
      .map(x=>{
        let score=0;
        if(x.hay.startsWith(q)) score+=80;
        if(x.hay.includes(q)) score+=45;
        for(const t of tokens){
          if(x.hay.includes(t)) score+=12;
          else return {...x,score:0};
        }
        return {...x,score};
      })
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ru'))
      .slice(0,12);
    if(!matches.length){
      results.innerHTML='<div class="home-search-empty">Ничего не нашли в справочнике. Нажмите «Не нашли нужного?» и укажите герб вручную.</div>';
      results.hidden=false;return;
    }
    results.innerHTML=matches.map((x,i)=>'<button type="button" class="offer-result" data-entity-index="'+i+'"><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.meta)+'</small></button>').join('');
    results.hidden=false;
    results.querySelectorAll('[data-entity-index]').forEach((btn,i)=>btn.addEventListener('click',()=>{
      heraldry.value=matches[i].name;
      results.hidden=true;
    }));
  }
  heraldry.addEventListener('input',renderMatches);
  heraldry.addEventListener('focus',renderMatches);
  document.addEventListener('click',e=>{if(!e.target.closest('.offer-heraldry-wrap'))results.hidden=true});

  customToggle.addEventListener('click',()=>{
    const open=customWrap.hidden;
    customWrap.hidden=!open;
    customToggle.textContent=open?'Скрыть ручной ввод':'Не нашли нужного? Указать вручную';
    if(open) customInput.focus();
  });

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const data=new FormData(form);
    const chosen=String(data.get('custom_heraldry')||'').trim()||String(data.get('heraldry')||'').trim()||'Не указано'
    const methodLabels={phone:'Телефон',telegram:'Telegram',max:'MAX',whatsapp:'WhatsApp',email:'Email'};
    const entry={id:'З-ТЕСТ-'+crypto.randomUUID().slice(0,8).toUpperCase(),customer:String(data.get('name')||'').trim()||'Без имени',subject:chosen,size:[data.get('width'),data.get('height')].some(Boolean)?'Ширина: '+(data.get('width')||'—')+' см · высота: '+(data.get('height')||'—')+' см':'Размер уточняется',contactMethod:methodLabels[data.get('contact_method')]||'',contact:String(data.get('contact_value')||''),status:'Новая',date:new Date().toISOString()};
    let note=form.querySelector('[data-test-offer-result]');
    if(!note){note=document.createElement('p');note.dataset.testOfferResult='';note.setAttribute('role','status');note.className='offer-note';form.appendChild(note);}
    try{
      const key='derzhava_test_requests_v1', list=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(list))throw Error('Invalid data');
      list.unshift(entry);localStorage.setItem(key,JSON.stringify(list));
      form.reset();updateContact();results.hidden=true;customWrap.hidden=true;customToggle.textContent='Не нашли нужного? Указать вручную';
      note.textContent='Тестовая заявка '+entry.id+' сохранена в админке. ';
      const link=document.createElement('a');link.href='admin-preview.html';link.textContent='Открыть админку';note.appendChild(link);
    }catch(_){note.textContent='Не удалось сохранить заявку в браузере.';}
    note.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
})();
