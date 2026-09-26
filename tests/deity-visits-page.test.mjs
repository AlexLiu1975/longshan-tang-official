import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const publicPages = [
  'public/index.html',
  'public/pages/about.html',
  'public/pages/news.html',
  'public/pages/birthdays.html',
  'public/pages/ai.html',
  'public/pages/divination.html',
  'public/pages/twenty-eight-mansions.html',
  'public/pages/contact.html',
  'public/pages/deity-visits.html'
];

test('the deity visits history page exists and is linked beneath About on every public page', () => {
  assert.equal(existsSync('public/pages/deity-visits.html'), true, 'missing deity visits page');

  for (const page of publicPages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /class="nav-dropdown(?:[^"]*)"[^>]*data-section="about"/, `${page} needs the About dropdown`);
    assert.match(html, /aria-label="展開認識隴善堂選單"/, `${page} needs an accessible About submenu trigger`);
    assert.match(html, /<a[^>]+href="\/pages\/deity-visits\.html"[^>]*>神尊蒞臨<\/a>/, `${page} needs the deity visits link`);
  }
});

test('the history page preserves all five records in year and lunar-date order', () => {
  const html = readFileSync('public/pages/deity-visits.html', 'utf8');
  const records = [
    ['乙巳年', '農曆二月十五日', '道祖聖誕'],
    ['丙午年', '農曆正月初一', '新春團拜'],
    ['丙午年', '農曆四月二十六日', '李府千歲聖誕'],
    ['丙午年', '農曆七月二十九日', '地藏王菩薩聖誕'],
    ['丙午年', '農曆八月十五日', '神尊蒞臨']
  ];

  let previousPosition = -1;
  for (const [year, date, event] of records) {
    const position = html.indexOf(`data-record="${year}-${date}"`);
    assert.ok(position > previousPosition, `${year}${date} must appear in chronological order`);
    const record = html.slice(position, html.indexOf('</article>', position));
    assert.ok(record.includes(event), `${year}${date} needs ${event}`);
    previousPosition = position;
  }

  for (const detail of [
    '孔夫子（無金身）',
    '元明文舉天無量壽天帝',
    '張府天師（祖天師 張道陵）',
    '來帶走56條靈',
    '太始無上混一大道君太聖祖',
    '來源地未註明'
  ]) {
    assert.ok(html.includes(detail), `missing preserved historical detail: ${detail}`);
  }
});

test('the history page exposes responsive timeline and mobile table safeguards', () => {
  const html = readFileSync('public/pages/deity-visits.html', 'utf8');
  const css = readFileSync('public/deity-visits.css', 'utf8');

  assert.match(html, /class="history-timeline"/);
  assert.match(html, /class="record-table-wrap"/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /min-width:\s*620px/);
}
);
