import assert from 'node:assert/strict';
import { buildInstructions } from '../functions/lib/ai-policy.js';

const text = buildInstructions();
for (const phrase of ['繁體中文', '不代表神明指示', '神明裁示', '醫療', '法律', '投資', '/pages/news.html', '/pages/birthdays.html']) {
  assert.ok(text.includes(phrase), `missing policy phrase: ${phrase}`);
}
console.log('PASS: AI policy');
