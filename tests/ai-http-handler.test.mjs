import assert from 'node:assert/strict';
import { createAiHttpHandler } from '../functions/lib/http-handler.js';

function makeRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; }
  };
}

async function run(req, ask) {
  const res = makeRes();
  await createAiHttpHandler({ ask })(req, res);
  return res;
}

let res = await run({ method: 'GET', is: () => true, body: {} }, async () => 'x');
assert.equal(res.statusCode, 405);
assert.deepEqual(res.payload, { ok: false, error: 'METHOD_NOT_ALLOWED' });

res = await run({ method: 'POST', is: () => false, body: {} }, async () => 'x');
assert.equal(res.statusCode, 415);
assert.deepEqual(res.payload, { ok: false, error: 'UNSUPPORTED_MEDIA_TYPE' });

res = await run({ method: 'POST', is: () => true, body: {} }, async () => 'x');
assert.equal(res.statusCode, 400);
assert.deepEqual(res.payload, { ok: false, error: 'INVALID_MESSAGE' });

res = await run({ method: 'POST', is: () => true, body: { message: '觀音菩薩是誰？' } }, async () => '文化說明');
assert.equal(res.statusCode, 200);
assert.deepEqual(res.payload, { ok: true, answer: '文化說明' });

res = await run({ method: 'POST', is: () => true, body: { message: '測試' } }, async () => { throw new Error('sk-secret-value'); });
assert.equal(res.statusCode, 503);
assert.deepEqual(res.payload, { ok: false, error: 'AI_SERVICE_UNAVAILABLE' });
assert.ok(!JSON.stringify(res.payload).includes('sk-secret-value'));

console.log('PASS: AI HTTP handler');
