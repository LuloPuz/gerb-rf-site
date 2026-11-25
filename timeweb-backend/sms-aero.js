'use strict';
// Provider acceptance is not proof of delivery. No retries to avoid double charges.
function createSmsSender({email,key,sign,fetchImpl=fetch}) {
  if (!email || !key || !sign) throw Error('SMS Aero credentials are not configured');
  return async (phone,code)=>{
    const res=await fetchImpl('https://gate.smsaero.ru/v2/sms/send',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{Authorization:'Basic '+Buffer.from(email+':'+key).toString('base64'),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
      body:new URLSearchParams({number:phone,sign,text:'Держава: код входа '+code+'. Никому не сообщайте.'})
    });
    const data=await res.json();
    if (!res.ok || data.success!==true) throw Error('SMS provider rejected request');
  };
}
module.exports={createSmsSender};
