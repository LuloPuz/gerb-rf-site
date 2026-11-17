
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
    const body=[
      'Запрос на коммерческое предложение',
      '',
      'Имя: '+String(data.get('name')||''),
      'Связаться через: '+(methodLabels[data.get('contact_method')]||data.get('contact_method')),
      'Контакт: '+String(data.get('contact_value')||''),
      '',
      'Какой герб нужен: '+chosen,
      'Примерная ширина: '+String(data.get('width')||'')+' см',
      'Примерная высота: '+String(data.get('height')||'')+' см'
    ].join('\n');
    window.location.href='mailto:xxx@xxx.xxx?subject='+encodeURIComponent('Запрос на предложение — '+chosen)+'&body='+encodeURIComponent(body);
  });
})();
