import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/pages/divination.html', 'utf8');
const css = fs.readFileSync('public/divination.css', 'utf8');

for (const text of ['百位籤筒','十位籤筒','個位籤筒','抽百位','抽十位','抽個位']) {
  assert.ok(!html.includes(text), `legacy label should be removed: ${text}`);
}
for (const text of ['抽第一支','抽第二支','抽第三支']) {
  assert.ok(html.includes(text), `missing draw label: ${text}`);
}
assert.ok(css.includes('width:118px'), 'slimmer cylinder width should be 118px');
assert.ok(css.includes('width:88px'), 'slimmer pot width should be 88px');

console.log('PASS: refined slim cylinders and neutral draw labels');
