import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';

const origin = 'https://dulceruta.pages.dev';
const password = 'a-private-test-secret-for-ci';
const db = { prepare() { return { all: async () => ({ results: [] }), first: async () => ({ revision: 0 }) }; } };
const context = (path, options = {}, env = {DB: db, ADMIN_PASSWORD:password}) => ({
  request: new Request(origin + path, options),
  env,
});

test('the public API never exposes secrets and starts empty', async () => {
  const res = await onRequest(context('/api/puntos'));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test('D1 without binding returns a recoverable error', async () => {
  const res = await onRequest(context('/api/puntos', {}, {}));
  assert.equal(res.status, 503);
});

test('login rejects incorrect password', async () => {
  const res = await onRequest(context('/api/admin/login', {
    method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({password:'wrong-password'}),
  }));
  assert.equal(res.status, 401);
});

test('a valid password produces a HttpOnly session, not a token in JSON', async () => {
  const res = await onRequest(context('/api/admin/login', {
    method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({password}),
  }));
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const token = cookie.split(';')[0];
  const session = await onRequest(context('/api/admin/session', {headers:{Cookie:token}}));
  assert.deepEqual(await session.json(), {authenticated:true});
  const publicResult = await onRequest(context('/api/admin/session'));
  assert.deepEqual(await publicResult.json(), {authenticated:false});
});

test('anonymous mutation is forbidden', async () => {
  const res = await onRequest(context('/api/admin/puntos', {
    method:'PUT',
    headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({revision:0,points:[]}),
  }));
  assert.equal(res.status, 401);
});

test('cross-origin login is denied', async () => {
  const res = await onRequest(context('/api/admin/login', {
    method:'POST',
    headers:{Origin:'https://attacker.example','Content-Type':'application/json'},
    body:JSON.stringify({password}),
  }));
  assert.equal(res.status, 403);
});
