import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/pages/divination.html', 'utf8');
for (const id of ['draw-hundreds', 'draw-tens', 'draw-ones', 'hexagram-code', 'hexagram-result', 'reset-divination']) {
  assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
}
assert.ok(html.includes('/divination.css'), 'missing divination stylesheet');
assert.ok(html.includes('/divination.js'), 'missing divination script');
assert.ok(html.includes('抽第一支'));
assert.ok(html.includes('抽第二支'));
assert.ok(html.includes('抽第三支'));
assert.ok(!html.includes('百位籤筒'));
assert.ok(!html.includes('十位籤筒'));
assert.ok(!html.includes('個位籤筒'));

console.log('PASS: three-cylinder divination page structure');
