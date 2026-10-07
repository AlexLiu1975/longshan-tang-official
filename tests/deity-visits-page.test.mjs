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

test('the history page preserves all six records in reverse chronological order', () => {
  const html = readFileSync('public/pages/deity-visits.html', 'utf8');
  const records = [
    ['丙午年', '農曆八月十五日', '神尊蒞臨'],
    ['丙午年', '農曆七月二十九日', '地藏王菩薩聖誕'],
    ['丙午年', '農曆七月十二日', '中元普渡蒞臨神尊'],
    ['丙午年', '農曆四月二十六日', '李府千歲聖誕'],
    ['丙午年', '農曆正月初一日', '新春團拜'],
    ['乙巳年', '農曆二月十五日', '道祖聖誕']
  ];

  let previousPosition = -1;
  for (const [year, date, event] of records) {
    const position = html.indexOf(`data-record="${year}-${date}"`);
    assert.ok(position > previousPosition, `${year}${date} must appear in reverse chronological order`);
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
    '來源地未註明',
    '宜蘭道教總廟',
    '第一代天師',
    '發旨',
    '賜旨　隴善堂 李府千歲',
    '高雄三鳳宮',
    '哪吒三太子'
  ]) {
    assert.ok(html.includes(detail), `missing preserved historical detail: ${detail}`);
  }
});

test('every record uses the full cyclical-year lunar date and the standard table columns', () => {
  const html = readFileSync('public/pages/deity-visits.html', 'utf8');
  const articles = [...html.matchAll(/<article class="history-record"[\s\S]*?<\/article>/g)].map((match) => match[0]);

  assert.equal(articles.length, 6, 'all six historical records must remain present');

  for (const article of articles) {
    assert.match(
      article,
      /<h3 class="record-date">[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農曆.+日<\/h3>/,
      'each displayed date must include the cyclical year, 農曆, month, and 日'
    );
    assert.match(
      article,
      /<thead><tr><th scope="col">№<\/th><th scope="col">宮廟／聖地<\/th><th scope="col">蒞臨神尊<\/th>/,
      'each table must start with the standard three columns'
    );
  }

  const augustRecord = articles.find((article) => article.includes('丙午年農曆八月十五日'));
  assert.ok(augustRecord, 'missing 丙午年農曆八月十五日 record');
  assert.equal(
    [...augustRecord.matchAll(/來源地未註明/g)].length,
    3,
    'all three unrecorded sources on 丙午年農曆八月十五日 must be labeled'
  );

  const importantRecord = articles.find((article) => article.includes('來帶走56條靈'));
  assert.match(
    importantRecord,
    /<th scope="col">重要事蹟／紀錄<\/th>/,
    'records with important details must use the standard detail column'
  );
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
