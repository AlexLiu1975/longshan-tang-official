import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const pagesWithNavigation = [
  'public/index.html',
  'public/pages/about.html',
  'public/pages/deity-visits.html',
  'public/pages/news.html',
  'public/pages/birthdays.html',
  'public/pages/ai.html',
  'public/pages/divination.html',
  'public/pages/twenty-eight-mansions.html',
  'public/pages/contact.html',
];

test('all public navigation menus expose 小六壬起卦 with the corrected name', () => {
  for (const page of pagesWithNavigation) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /<a[^>]+href="\/pages\/xiao-liu-ren\.html"[^>]*>小六壬起卦<\/a>/, `${page} needs 小六壬起卦`);
    assert.doesNotMatch(html, /小六任/, `${page} contains the incorrect name`);
  }
});

test('AI services page links to the new calculator', () => {
  const html = readFileSync('public/pages/ai.html', 'utf8');
  assert.match(html, /href="\/pages\/xiao-liu-ren\.html"/);
  assert.match(html, /<h3>小六壬起卦<\/h3>/);
});

test('calculator page loads the shared site chrome, palm asset, styles, vendor and module', () => {
  assert.equal(existsSync('public/pages/xiao-liu-ren.html'), true);
  const html = readFileSync('public/pages/xiao-liu-ren.html', 'utf8');
  for (const required of [
    '小六壬起卦', '農曆手動輸入', '國曆自動轉換', '入門教學',
    '/assets/left-palm.png', '/xiao-liu-ren.css', '/vendor/lunar.js', '/xiao-liu-ren.js',
  ]) assert.match(html, new RegExp(required.replaceAll('.', '\\.')));
  for (const palace of ['大安', '留連', '速喜', '赤口', '小吉', '空亡']) {
    assert.match(html, new RegExp(`data-palace="${palace}"`));
  }
  assert.doesNotMatch(html, />\s*(食指|中指|無名指)(根部|指甲)\s*</);
});

test('calculator core follows the fixed palace sequence and examples', async () => {
  const { calculateReading, branchFromTime } = await import('../public/xiao-liu-ren.js');
  assert.deepEqual(calculateReading({ lunarMonth: 1, lunarDay: 1, branch: '子' }).results, ['大安', '大安', '大安']);
  assert.deepEqual(calculateReading({ lunarMonth: 2, lunarDay: 2, branch: '子' }).results.slice(0, 2), ['留連', '速喜']);
  assert.deepEqual(calculateReading({ lunarMonth: 9, lunarDay: 15, branch: '午' }).results, ['速喜', '小吉', '小吉']);
  assert.equal(branchFromTime(23), '子');
  assert.equal(branchFromTime(0), '子');
  assert.equal(branchFromTime(22), '亥');
});

test('solar conversion identifies ordinary and leap lunar dates', async () => {
  const { Solar } = require('../public/vendor/lunar.js');
  const { convertSolarInput } = await import('../public/xiao-liu-ren.js');
  assert.deepEqual(convertSolarInput({ date: '2024-02-10', time: '12:00' }, Solar), { lunarYear: 2024, lunarMonth: 1, lunarDay: 1, isLeapMonth: false, branch: '午' });
  assert.deepEqual(convertSolarInput({ date: '2023-03-22', time: '12:00' }, Solar), { lunarYear: 2023, lunarMonth: 2, lunarDay: 1, isLeapMonth: true, branch: '午' });
  assert.throws(() => convertSolarInput({ date: '1900-12-31', time: '12:00' }, Solar), RangeError);
});

test('calculator stylesheet pins lower palaces to finger-base classes and protects mobile width', () => {
  const css = readFileSync('public/xiao-liu-ren.css', 'utf8');
  for (const className of ['.index-base', '.middle-base', '.ring-base']) assert.match(css, new RegExp(className.replace('.', '\\.')));
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /\[hidden\]\{display:none!important\}/, 'mode panels must remain hidden when inactive');
});
