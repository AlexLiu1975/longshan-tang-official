import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomDigit, buildCode, lookupHexagram } from '../public/divination.js';

const data = JSON.parse(fs.readFileSync('public/data/divination.json', 'utf8'));

for (let i = 0; i < 5000; i += 1) {
  const n = randomDigit();
  assert.ok(Number.isInteger(n), 'random digit must be an integer');
  assert.ok(n >= 1 && n <= 8, `random digit out of range: ${n}`);
}

assert.equal(buildCode(1, 1, 1), '111');
assert.equal(buildCode(3, 7, 8), '378');
assert.equal(buildCode(8, 8, 8), '888');
assert.equal(lookupHexagram(data, '111').name, '乾');
assert.equal(lookupHexagram(data, '888').name, '坤');

for (let a = 1; a <= 8; a += 1) {
  for (let b = 1; b <= 8; b += 1) {
    for (let c = 1; c <= 8; c += 1) {
      const code = buildCode(a, b, c);
      assert.ok(lookupHexagram(data, code), `lookup failed for ${code}`);
    }
  }
}

console.log('PASS: random 1-8, code building, and all 512 lookups');
