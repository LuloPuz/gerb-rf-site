// Phone input assistance. A leading + always opts into international input.
(function(){
'use strict';
function assist(value){
 const raw=String(value).trimStart();
 if(!raw)return '';
 if(raw.startsWith('+'))return raw;
 if(!/^[0-9]/.test(raw))return raw;
 const digits=raw.replace(/\D/g,'');
 if(!/^[0-9 ()-]+$/.test(raw))return raw;
 if(digits.length===10)return '+7'+digits;
 if(digits.length===11&&digits.startsWith('8'))return '+7'+digits.slice(1);
 if(digits.startsWith('7'))return '+'+raw;
 if(digits.startsWith('8'))return '+7'+raw.slice(1);
 return '+7'+raw;
}
if(typeof module==='object'&&module.exports)module.exports={assist};
if(typeof document==='undefined')return;
const isPhone=el=>el instanceof HTMLInputElement&&el.type==='tel'&&!el.disabled&&!el.readOnly;
document.addEventListener('input',e=>{
 const el=e.target;if(!isPhone(el)||e.isComposing)return;
 if(e.inputType?.startsWith('delete'))return;
 const before=el.value,position=el.selectionStart,next=assist(before);
 if(next===before)return;
 el.value=next;
 if(position!==null){const offset=Math.max(0,Math.min(next.length,position+next.length-before.length));el.setSelectionRange(offset,offset);}
});
document.addEventListener('focusin',e=>{
 const el=e.target;if(!isPhone(el))return;
 if(!el.placeholder)el.placeholder='+7 (___) ___-__-__';
});
})();
