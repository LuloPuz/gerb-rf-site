'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizePhone,mac,matches,hashToken,sessionCookie,readToken,createCustomerAuth}=require('./customer-auth');
const {createSmsSender}=require('./sms-aero');
test('Russian phone formats and invalid inputs',()=>{
  for(const v of ['+7 (999) 123-45-67','89991234567','9991234567']) assert.equal(normalizePhone(v),'79991234567');
  for(const v of ['a79991234567','+33123456789','name@mail.ru','123',null]) assert.equal(normalizePhone(v),null);
});
test('code MAC is bound to challenge; session cookie is protected',()=>{
  const key='x'.repeat(32);
  const a=mac(key,'code','id1:000001');
  assert(matches(a,mac(key,'code','id1:000001')));
  assert(!matches(a,mac(key,'code','id2:000001')));
  assert(!matches(a,'bad'));
  const token=require('node:crypto').randomBytes(32).toString('base64url');
  const cookie=sessionCookie(token);
  assert.equal(readToken(cookie),token);
  assert.match(cookie,/Secure; HttpOnly; SameSite=Strict/);
  assert.equal(hashToken(token).length,64);
});
test('no database or SMS calls on rejected origin or missing session',async()=>{
  const fail=()=>{throw Error('unexpected access')};
  const auth=createCustomerAuth({pool:{query:fail,connect:fail},secret:'x'.repeat(32),sendSms:fail,allowedOrigin:'https://example.invalid'});
  assert.equal((await auth('customer-request-code',{identifier:'79991234567'},{method:'POST',origin:'https://other.invalid'})).status,403);
  assert.equal((await auth('customer-orders',{},{method:'GET',origin:'',cookie:''})).status,401);
});
test('SMS sender uses POST and never retries on rejection',async()=>{
  let calls=0;
  const sender=createSmsSender({email:'test@example.invalid',key:'fake',sign:'Test',fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'https://gate.smsaero.ru/v2/sms/send');assert.equal(options.method,'POST');
    assert.equal(options.body.get('number'),'79991234567');return {ok:false,json:async()=>({success:false})};
  }});
  await assert.rejects(sender('79991234567','000001'));
  assert.equal(calls,1);
});
