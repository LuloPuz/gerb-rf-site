'use strict';

const crypto = require('crypto');
const { Pool } = require('pg');

const STATUS_VALUES = new Set([
  'Заказ принят',
  'Подтверждён',
  'В производстве',
  'Готов',
  'Отправлен',
  'Получен',
  'Отменён'
]);

let pool;
function db() {
  if (!pool) {
    const useSsl = String(process.env.PGSSL || '').toLowerCase() === 'true';
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 6432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function response(statusCode, payload, origin) {
  const origins = allowedOrigins();
  const allowOrigin = origins.includes('*') || (origin && origins.includes(origin)) ? origin || '*' : '';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS';
  }
  return {
    statusCode,
    headers,
    isBase64Encoded: false,
    body: JSON.stringify(payload)
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  if (Buffer.byteLength(raw, 'utf8') > 180000) {
    const error = new Error('Слишком большой запрос');
    error.statusCode = 413;
    throw error;
  }
  return JSON.parse(raw);
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function makeOrderNumber() {
  const value = crypto.randomInt(0, 10000000);
  return 'ДРЖ-' + String(value).padStart(7, '0');
}

function tokenSecret() {
  const secret = String(process.env.ADMIN_TOKEN_SECRET || '');
  if (secret.length < 32) throw new Error('ADMIN_TOKEN_SECRET is not configured');
  return secret;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signAdminToken(admin) {
  const payload = b64url(JSON.stringify({
    sub: String(admin.id),
    email: admin.email,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
  }));
  const signature = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return payload + '.' + signature;
}

function verifyAdminToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const expected = crypto.createHmac('sha256', tokenSecret()).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function bearer(event) {
  const headers = event.headers || {};
  const raw = headers.Authorization || headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1] : '';
}

async function requireAdmin(event) {
  const payload = verifyAdminToken(bearer(event));
  if (!payload) return null;
  const result = await db().query(
    'select id, email, active from admin_users where id = $1 and active = true',
    [payload.sub]
  );
  return result.rows[0] || null;
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1) {
    const error = new Error('Корзина пуста');
    error.statusCode = 400;
    throw error;
  }
  if (rawItems.length > 50) {
    const error = new Error('Слишком много позиций');
    error.statusCode = 400;
    throw error;
  }
  return rawItems.map((raw) => {
    const price = Math.min(Math.max(Number(raw && raw.price) || 0, 0), 10000000);
    const qty = Math.min(Math.max(Math.trunc(Number(raw && raw.qty) || 1), 1), 999);
    return {
      id: clean(raw && raw.id, 500),
      title: clean(raw && raw.title, 300),
      finish: clean(raw && raw.finish, 200),
      size: clean(raw && raw.size, 100),
      price,
      qty,
      image: clean(raw && raw.image, 1000),
      url: clean(raw && raw.url, 1000)
    };
  });
}

async function createOrder(body) {
  const customer = body.customer || {};
  const name = clean(customer.name, 160);
  const phone = clean(customer.phone, 40);
  const email = clean(customer.email, 200);
  const organization = clean(customer.organization, 250);
  const inn = clean(customer.inn, 40);
  const address = clean(customer.address, 500);
  const delivery = clean(body.delivery, 500);
  const comment = clean(body.comment, 3000);
  const items = normalizeItems(body.items);

  if (name.length < 2) {
    const error = new Error('Укажите имя');
    error.statusCode = 400;
    throw error;
  }
  if (phone.length < 7) {
    const error = new Error('Укажите телефон');
    error.statusCode = 400;
    throw error;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (!(total > 0) || total > 100000000) {
    const error = new Error('Некорректная сумма заказа');
    error.statusCode = 400;
    throw error;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderNumber = makeOrderNumber();
    try {
      const result = await db().query(
        `insert into orders (
          order_number, status, total, customer_name, customer_phone, customer_email,
          organization, inn, address, delivery, comment, items, source
        ) values ($1, 'Заказ принят', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'website')
        returning id, order_number, status, total, created_at`,
        [orderNumber, total, name, phone, email, organization, inn, address, delivery, comment, JSON.stringify(items)]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        number: row.order_number,
        status: row.status,
        total: Number(row.total),
        created_at: row.created_at
      };
    } catch (error) {
      if (error && error.code === '23505') continue;
      throw error;
    }
  }
  throw new Error('Не удалось создать номер заказа');
}

async function adminLogin(body) {
  const email = clean(body.email, 200).toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return null;
  const result = await db().query(
    `select id, email
       from admin_users
      where lower(email) = lower($1)
        and active = true
        and password_hash = crypt($2, password_hash)
      limit 1`,
    [email, password]
  );
  const admin = result.rows[0];
  if (!admin) return null;
  return { token: signAdminToken(admin), admin: { id: admin.id, email: admin.email } };
}

async function listOrders() {
  const result = await db().query(
    `select id, order_number, created_at, updated_at, status, total,
            customer_name, customer_phone, customer_email, organization, inn,
            address, delivery, comment, items, source
       from orders
      order by created_at desc
      limit 1000`
  );
  return result.rows.map((row) => ({ ...row, total: Number(row.total) }));
}

async function updateStatus(body) {
  const id = clean(body.id, 80);
  const status = clean(body.status, 80);
  if (!id || !STATUS_VALUES.has(status)) {
    const error = new Error('Некорректные данные статуса');
    error.statusCode = 400;
    throw error;
  }
  const result = await db().query(
    `update orders
        set status = $2, updated_at = now()
      where id = $1
      returning id, order_number, created_at, updated_at, status, total,
                customer_name, customer_phone, customer_email, organization, inn,
                address, delivery, comment, items, source`,
    [id, status]
  );
  if (!result.rows[0]) {
    const error = new Error('Заказ не найден');
    error.statusCode = 404;
    throw error;
  }
  return { ...result.rows[0], total: Number(result.rows[0].total) };
}

exports.handler = async function handler(event) {
  const origin = (event.headers && (event.headers.Origin || event.headers.origin)) || '';
  if (String(event.httpMethod || '').toUpperCase() === 'OPTIONS') {
    return response(204, {}, origin);
  }

  const action = clean(event.queryStringParameters && event.queryStringParameters.action, 80);
  try {
    if (action === 'health') {
      await db().query('select 1');
      return response(200, { ok: true }, origin);
    }

    if (action === 'create-order') {
      const result = await createOrder(parseBody(event));
      return response(201, result, origin);
    }

    if (action === 'admin-login') {
      const result = await adminLogin(parseBody(event));
      if (!result) return response(401, { error: 'Неверный email или пароль' }, origin);
      return response(200, result, origin);
    }

    if (action === 'admin-me') {
      const admin = await requireAdmin(event);
      if (!admin) return response(401, { error: 'Требуется вход' }, origin);
      return response(200, { admin: { id: admin.id, email: admin.email } }, origin);
    }

    if (action === 'admin-orders') {
      const admin = await requireAdmin(event);
      if (!admin) return response(401, { error: 'Требуется вход' }, origin);
      return response(200, { orders: await listOrders() }, origin);
    }

    if (action === 'admin-update-status') {
      const admin = await requireAdmin(event);
      if (!admin) return response(401, { error: 'Требуется вход' }, origin);
      return response(200, { order: await updateStatus(parseBody(event)) }, origin);
    }

    return response(404, { error: 'Неизвестный запрос' }, origin);
  } catch (error) {
    const status = Number(error && error.statusCode) || 500;
    if (status >= 500) console.error('Backend error:', error && error.message ? error.message : error);
    return response(status, { error: status >= 500 ? 'Сервис временно недоступен' : error.message }, origin);
  }
};
