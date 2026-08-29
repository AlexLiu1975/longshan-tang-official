import assert from 'node:assert/strict';
import { validateMessage, AiInputError } from '../functions/lib/validation.js';

assert.equal(validateMessage('  觀音菩薩是誰？  '), '觀音菩薩是誰？');
assert.throws(() => validateMessage(''), AiInputError);
assert.throws(() => validateMessage('   '), AiInputError);
assert.throws(() => validateMessage(null), AiInputError);
assert.throws(() => validateMessage('字'.repeat(801)), AiInputError);
console.log('PASS: AI input validation');
