'use strict';
const http = require('node:http');

const methods = new Map([
  ['health','GET'], ['admin-login','POST'], ['admin-me','POST'],
  ['admin-orders','GET'], ['admin-update-status','POST']
]);
const customerMethods = new Map([
 ['customer-request-code','POST'],['customer-verify-code','POST'],
 ['customer-me','GET'],['customer-orders','GET'],['customer-logout','POST']
]);
for (const [action,method] of customerMethods) methods.set(action,method);
const MAX_BODY = 180000;

function createServer(handler, options = {}) {
  const origins = new Set(options.origins || []);
  const buckets = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key,b] of buckets) if (b.until <= now) buckets.delete(key);
  }, 60000);
  timer.unref();

  const server = http.createServer({maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000}, async (req,res) => {
    const origin = req.headers.origin || '';
    const cors = origin && origins.has(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    } : {};
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',...cors};
    const reply = (status, data, extra={}) => {
      if (res.headersSent || res.destroyed) return;
      res.writeHead(status,{...headers,...extra});
      res.end(status === 204 ? undefined : JSON.stringify(data));
    };
    try {
      const url = new URL(req.url,'http://localhost');
      if (url.pathname !== '/api') return reply(404,{error:'Маршрут не найден'});
      if (origin && !origins.has(origin)) return reply(403,{error:'Источник не разрешён'});
      if (req.method === 'OPTIONS') return reply(204,null);
      const action = url.searchParams.get('action');
      // Do not publish an endpoint that accepts client-supplied prices.
      // Customer auth, authoritative pricing and order validation are separate release gates.
      if (action === 'create-order') return reply(503,{error:'Приём заказов пока не подключён'});
      if (!methods.has(action)) return reply(404,{error:'Неизвестный запрос'});
      if (req.method !== methods.get(action)) return reply(405,{error:'Метод не разрешён'},{Allow:methods.get(action)});
      // This server listens on loopback only. Nginx must overwrite X-Real-IP.
      const ip = options.trustLocalProxy ? (req.headers['x-real-ip'] || req.socket.remoteAddress) : req.socket.remoteAddress;
      const login = action === 'admin-login';
      const key = (login ? 'login:' : 'api:') + ip;
      const now = Date.now(), limit = login ? 5 : 120, windowMs = login ? 900000 : 60000;
      const bucket = buckets.get(key);
      if (bucket && bucket.until > now) {
        if (bucket.count >= limit) return reply(429,{error:'Слишком много запросов'},{'Retry-After':String(Math.ceil((bucket.until-now)/1000))});
        bucket.count++;
      } else {
        if (buckets.size >= 10000) return reply(503,{error:'Сервис временно недоступен'});
        buckets.set(key,{count:1,until:now+windowMs});
      }
      let body = '';
      if (req.method === 'POST') {
        const size = Number(req.headers['content-length'] || 0);
        if (size > MAX_BODY) { req.resume(); return reply(413,{error:'Слишком большой запрос'},{Connection:'close'}); }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > MAX_BODY) {
            reply(413,{error:'Слишком большой запрос'},{Connection:'close'});
            return;
          }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks).toString('utf8');
        if (body) {
          if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415,{error:'Ожидается JSON'});
          let parsed;
          try { parsed = JSON.parse(body); } catch { return reply(400,{error:'Некорректный JSON'}); }
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply(400,{error:'Некорректные данные'});
          if (login && (typeof parsed.password !== 'string' || Buffer.byteLength(parsed.password,'utf8') > 72 || typeof parsed.email !== 'string')) return reply(400,{error:'Некорректные данные входа'});
        }
      }
      if (customerMethods.has(action)) {
        if (!options.customerAuth) return reply(503,{error:'Авторизация пока не подключена'});
        const result = await options.customerAuth(action, body ? JSON.parse(body) : {}, {method:req.method,origin,ip,cookie:req.headers.cookie});
        return reply(result.status,result.data,result.headers);
      }
      const result = await handler({httpMethod:req.method,headers:{authorization:req.headers.authorization || '',origin},queryStringParameters:{action},body,isBase64Encoded:false});
      reply(result.statusCode, JSON.parse(result.body || '{}'));
    } catch {
      reply(500,{error:'Сервис временно недоступен'});
    }
  });
  server.on('close',()=>clearInterval(timer));
  return server;
}

if (require.main === module) {
  for (const key of ['PGHOST','PGDATABASE','PGUSER','PGPASSWORD','ADMIN_TOKEN_SECRET']) {
    if (!process.env[key]) throw new Error('Missing required environment variable: '+key);
  }
  if (process.env.ADMIN_TOKEN_SECRET.length < 32) throw new Error('ADMIN_TOKEN_SECRET is too short');
  if (process.env.PGHOST !== '127.0.0.1') throw new Error('Use the local PostgreSQL instance');
  process.env.PGPORT ||= '5432';
  process.env.PGSSL = 'false';
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (origins.some(s=>!/^https:\/\/[^/]+$/.test(s))) throw new Error('Use explicit HTTPS origins');
  const {handler} = require('../yandex-backend/index.js');
  let customerAuth;
  if (process.env.CUSTOMER_AUTH_ENABLED === 'true') {
    const {Pool}=require('../yandex-backend/node_modules/pg');
    const {createCustomerAuth}=require('./customer-auth');
    const {createSmsSender}=require('./sms-aero');
    const pool=new Pool({max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:10000});
    if (!origins.includes(process.env.CUSTOMER_ORIGIN)) throw Error('CUSTOMER_ORIGIN must be an allowed origin');
    customerAuth=createCustomerAuth({pool,secret:process.env.CUSTOMER_AUTH_SECRET,allowedOrigin:process.env.CUSTOMER_ORIGIN,
      dailyLimit:Number(process.env.SMS_DAILY_LIMIT || 20),sendSms:createSmsSender({email:process.env.SMS_AERO_EMAIL,key:process.env.SMS_AERO_KEY,sign:process.env.SMS_AERO_SIGN})});
  }
  const server = createServer(handler,{origins,trustLocalProxy:true,customerAuth});
  server.listen(Number(process.env.PORT || 3000),'127.0.0.1',()=>console.log('Derzhava API listening on loopback'));
  process.on('SIGTERM',()=>{ server.close(()=>process.exit(0)); setTimeout(()=>process.exit(1),10000).unref(); });
}

module.exports = {createServer};
