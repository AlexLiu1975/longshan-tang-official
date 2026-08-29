import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/divination.json', 'utf8'));
const keys = Object.keys(data);

assert.equal(keys.length, 512, 'divination data must contain exactly 512 entries');

const expected = new Set();
for (let a = 1; a <= 8; a += 1) {
  for (let b = 1; b <= 8; b += 1) {
    for (let c = 1; c <= 8; c += 1) expected.add(`${a}${b}${c}`);
  }
}

for (const code of keys) {
  assert.match(code, /^[1-8]{3}$/);
  assert.ok(expected.has(code), `unexpected code ${code}`);
  assert.ok(data[code].name?.trim(), `missing name for ${code}`);
  assert.ok(data[code].text?.trim(), `missing text for ${code}`);
}
for (const code of expected) assert.ok(data[code], `missing code ${code}`);

assert.equal(data['111'].name, '乾');
assert.equal(data['888'].name, '坤');

console.log('PASS: verified all 512 Yijing divination entries');
