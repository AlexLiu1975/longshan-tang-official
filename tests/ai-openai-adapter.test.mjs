import assert from 'node:assert/strict';
import { askOpenAi } from '../functions/lib/openai-adapter.js';

let seenPayload;
const client = {
  responses: {
    async create(payload) {
      seenPayload = payload;
      return { output_text: '測試回答' };
    }
  }
};

const answer = await askOpenAi({ client, message: '觀音菩薩是誰？', model: 'test-model' });
assert.equal(answer, '測試回答');
assert.equal(seenPayload.model, 'test-model');
assert.equal(seenPayload.input, '觀音菩薩是誰？');
assert.ok(typeof seenPayload.instructions === 'string' && seenPayload.instructions.length > 20);
assert.ok(seenPayload.max_output_tokens > 0);
console.log('PASS: OpenAI adapter');
