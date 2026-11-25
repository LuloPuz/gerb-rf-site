'use strict';
const crypto = require('node:crypto');

const COOKIE = '__Host-derzhava_session';
const SESSION_SECONDS = 7 * 86400;
const GENERIC = {message:'Если телефон связан с заказом, код будет отправлен.'};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^[+0-9 ()-]+$/.test(value)) return null;
  let p=value.replace(/\D/g,'');
  if (p.length===10) p='7'+p;
  if (p.length===11 && p[0]==='8') p='7'+p.slice(1);
  return /^7[0-9]{10}$/.test(p) ? p : null;
}
function mac(secret, purpose, value) {
  return crypto.createHmac('sha256',secret).update(purpose+'\0'+value).digest('hex');
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function matches(a,b) {
  if (!/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
function sessionCookie(token, seconds=SESSION_SECONDS) {
  return COOKIE+'='+token+'; Path=/; Max-Age='+seconds+'; Secure; HttpOnly; SameSite=Strict';
}
function readToken(cookie) {
  const val=(cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  return /^[A-Za-z0-9_-]{43}$/.test(val)?val:null;
}
function createCustomerAuth({pool,secret,sendSms,dailyLimit=20,allowedOrigin}) {
  if (!secret || secret.length<32 || !Number.isInteger(dailyLimit) || dailyLimit<1 || !/^https:\/\/[^/]+$/.test(allowedOrigin||'')) throw Error('Invalid customer auth configuration');
  const result=(status,data,headers={})=>({status,data,headers});
  const unauthorized=()=>result(401,{error:'Требуется вход'});
  async function tx(fn) {
    const db=await pool.connect();
    try {await db.query('BEGIN'); const value=await fn(db); await db.query('COMMIT'); return value;}
    catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;} finally {db.release();}
  }
  async function requestCode(body,ip) {
    const phone=normalizePhone(body.identifier);
    if (!phone) return result(400,{error:'Укажите телефон в формате +7'});
    const challengeId=crypto.randomUUID();
    const contactMac=mac(secret,'contact',phone), ipMac=mac(secret,'ip',String(ip));
    const reserved=await tx(async db=>{
      // Serialize reservations across concurrent requests and server restarts.
      await db.query('SELECT pg_advisory_xact_lock(40420261)');
      const counts=(await db.query(`SELECT count(*) FILTER (WHERE contact_mac=$1 AND created_at>now()-interval '1 minute') AS cooldown,
        count(*) FILTER (WHERE contact_mac=$1) AS per_contact,
        count(*) FILTER (WHERE ip_mac=$2) AS per_ip
        FROM customer_sms_requests WHERE created_at>now()-interval '1 hour' AND (contact_mac=$1 OR ip_mac=$2)`,[contactMac,ipMac])).rows[0];
      if (+counts.cooldown || +counts.per_contact>=5 || +counts.per_ip>=15) return {limited:true};
      await db.query('INSERT INTO customer_sms_requests(contact_mac,ip_mac) VALUES($1,$2)',[contactMac,ipMac]);
      const count=(await db.query("SELECT count(*) AS n FROM customer_sms_challenges WHERE created_at>now()-interval '24 hours'")).rows[0];
      // Reserve even uncertain delivery attempts; never automatically retry a paid SMS.
      if (+count.n>=dailyLimit) return {limited:true};
      const customer=(await db.query(`SELECT c.id FROM customers c WHERE c.phone=$1 AND c.active
        AND EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=c.id)`,[phone])).rows[0];
      if (!customer) return {};
      const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
      await db.query('UPDATE customer_sms_challenges SET consumed_at=now() WHERE customer_id=$1 AND consumed_at IS NULL',[customer.id]);
      await db.query(`INSERT INTO customer_sms_challenges(id,customer_id,code_mac,expires_at)
        VALUES($1,$2,$3,now()+interval '5 minutes')`,[challengeId,customer.id,mac(secret,'code',challengeId+':'+code)]);
      return {code};
    });
    if (reserved.limited) return result(429,{error:'Лимит запросов исчерпан. Попробуйте позже.'});
    if (reserved.code) {
      try {
        await sendSms(phone,reserved.code);
        await pool.query('UPDATE customer_sms_challenges SET sent=true WHERE id=$1',[challengeId]);
      } catch {
        // Do not leak provider responses, phone numbers or OTPs into logs.
        await pool.query('UPDATE customer_sms_challenges SET consumed_at=now() WHERE id=$1',[challengeId]);
      }
    }
    return result(200,{...GENERIC,challengeId});
  }
  async function verify(body) {
    const phone=normalizePhone(body.identifier), id=body.challengeId, code=body.code;
    if (!phone || typeof id!=='string' || !uuid.test(id) || typeof code!=='string' || !/^\d{6}$/.test(code)) return result(400,{error:'Проверьте код'});
    const token=crypto.randomBytes(32).toString('base64url');
    const ok=await tx(async db=>{
      const row=(await db.query(`SELECT s.id,s.code_mac,s.customer_id FROM customer_sms_challenges s
        JOIN customers c ON c.id=s.customer_id WHERE s.id=$1 AND c.phone=$2 AND c.active
        AND s.sent AND s.consumed_at IS NULL AND s.expires_at>now() AND s.attempts<5
        AND EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=c.id) FOR UPDATE OF s`,[id,phone])).rows[0];
      if (!row) return false;
      if (!matches(row.code_mac,mac(secret,'code',id+':'+code))) {
        await db.query('UPDATE customer_sms_challenges SET attempts=attempts+1 WHERE id=$1',[id]);return false;
      }
      await db.query('UPDATE customer_sms_challenges SET consumed_at=now() WHERE id=$1',[id]);
      await db.query("INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(token),row.customer_id]);
      return true;
    });
    return ok?result(200,{ok:true},{'Set-Cookie':sessionCookie(token)}):result(401,{error:'Код неверный или истёк'});
  }
  async function customer(cookie) {
    const token=readToken(cookie); if (!token) return null;
    return (await pool.query(`SELECT c.id,c.phone,c.name,c.email,c.organization,c.inn,c.address
      FROM customer_sessions s JOIN customers c ON c.id=s.customer_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND c.active`,[hashToken(token)])).rows[0]||null;
  }
  return async function handle(action,body,ctx) {
    // Customer API is same-origin only. No cross-site cookies or demo fallback.
    if (ctx.method==='POST' && ctx.origin!==allowedOrigin) return result(403,{error:'Источник не разрешён'});
    if (ctx.origin && ctx.origin!==allowedOrigin) return result(403,{error:'Источник не разрешён'});
    if (action==='customer-request-code') return requestCode(body,ctx.ip);
    if (action==='customer-verify-code') return verify(body);
    if (action==='customer-logout') {
      const token=readToken(ctx.cookie);
      if (token) await pool.query('DELETE FROM customer_sessions WHERE token_hash=$1',[hashToken(token)]);
      return result(200,{ok:true},{'Set-Cookie':sessionCookie('',0)});
    }
    const c=await customer(ctx.cookie);
    if (!c) return unauthorized();
    if (action==='customer-me') return result(200,{customer:c});
    if (action==='customer-orders') {
      const rows=(await pool.query(`SELECT order_number AS number, created_at AS date,status,total,items
        FROM orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100`,[c.id])).rows;
      return result(200,{orders:rows.map(r=>({...r,total:Number(r.total)}))});
    }
    return result(404,{error:'Неизвестный запрос'});
  };
}
module.exports={createCustomerAuth,normalizePhone,mac,hashToken,matches,sessionCookie,readToken};
