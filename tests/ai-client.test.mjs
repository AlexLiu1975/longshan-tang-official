import assert from 'node:assert/strict';
import { requestAiAnswer } from '../public/ai-client.js';

const fallback = message => ({ text: `fallback:${message}`, action: '/fallback' });

let called = 0;
let result = await requestAiAnswer('  觀音菩薩是誰？  ', {
  fetchImpl: async (url, options) => {
    called++;
    assert.equal(url, '/api/ai');
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).message, '觀音菩薩是誰？');
    return { ok: true, async json() { return { ok: true, answer: 'AI 回答' }; } };
  },
  fallback
});
assert.deepEqual(result, { answer: 'AI 回答', fallback: false });
assert.equal(called, 1);

for (const fetchImpl of [
  async () => ({ ok: false, async json() { return {}; } }),
  async () => { throw new Error('network'); },
  async () => ({ ok: true, async json() { return { ok: true, answer: '   ' }; } })
]) {
  result = await requestAiAnswer('測試', { fetchImpl, fallback });
  assert.equal(result.fallback, true);
  assert.equal(result.answer, 'fallback:測試');
  assert.equal(result.action, '/fallback');
}

called = 0;
result = await requestAiAnswer('   ', { fetchImpl: async () => { called++; }, fallback });
assert.equal(called, 0);
assert.equal(result.fallback, true);

console.log('PASS: AI frontend client');
