'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('./server');

test('VPS adapter routes and protects staging endpoints', async () => {
  let calls=0;
  const server=createServer(async event=>{
    calls++;
    return {statusCode:200,body:JSON.stringify({action:event.queryStringParameters.action})};
  },{origins:['https://lulopuz.github.io']});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const api=base+'/api?action=';
  try {
    assert.equal((await fetch(api+'health')).status,200);
    assert.equal((await fetch(api+'health',{method:'POST'})).status,405);
    assert.equal((await fetch(api+'create-order',{method:'POST'})).status,503);
    assert.equal((await fetch(api+'admin-orders',{headers:{Origin:'https://evil.example'}})).status,403);
    const preflight=await fetch(api+'admin-login',{method:'OPTIONS',headers:{Origin:'https://lulopuz.github.io'}});
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),'https://lulopuz.github.io');
    assert.equal((await fetch(api+'admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{' })).status,400);
    for(let i=0;i<4;i++) assert.equal((await fetch(api+'admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',password:'test'})})).status,200);
    assert.equal((await fetch(api+'admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',password:'test'})})).status,429);
    assert.equal(calls,5);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
