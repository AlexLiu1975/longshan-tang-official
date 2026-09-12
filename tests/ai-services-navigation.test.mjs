import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publicPages = [
  'public/index.html',
  'public/pages/about.html',
  'public/pages/news.html',
  'public/pages/birthdays.html',
  'public/pages/ai.html',
  'public/pages/divination.html',
  'public/pages/twenty-eight-mansions.html',
  'public/pages/yanqin-chart.html',
  'public/pages/contact.html'
];

const serviceLinks = [
  ['線上占卦', '/pages/divination.html'],
  ['二十八宿介紹', '/pages/twenty-eight-mansions.html'],
  ['二十八宿自動排盤', '/pages/yanqin-chart.html']
];

test('every public page exposes the three AI service links in an accessible submenu', () => {
  for (const page of publicPages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /class="nav-dropdown(?:[^"]*)"/, `${page} needs the AI service dropdown`);
    assert.match(html, /aria-haspopup="true"/, `${page} needs a submenu trigger`);
    assert.match(html, /aria-expanded="false"/, `${page} needs a closed initial state`);
    assert.match(html, /class="nav-submenu"/, `${page} needs the submenu container`);
    for (const [label, href] of serviceLinks) {
      assert.match(html, new RegExp(`<a[^>]+href="${href.replaceAll('.', '\\.') }"[^>]*>${label}<\\/a>`), `${page} needs ${label}`);
    }
    assert.doesNotMatch(html, />線上抽籤</, `${page} must use the new service name`);
  }
});

test('the shared navigation supports click, escape, and outside-click submenu control', () => {
  const script = readFileSync('public/navigation.js', 'utf8');
  assert.match(script, /nav-dropdown-toggle/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /Escape/);
  assert.match(script, /document\.addEventListener\(['"]click['"]/);
});

test('the mansions page contains the complete ordered mansion, animal, and general mapping', () => {
  const html = readFileSync('public/pages/twenty-eight-mansions.html', 'utf8');
  const rows = [
    ['角宿', '角木蛟', '鄧禹'], ['亢宿', '亢金龍', '吳漢'], ['氐宿', '氐土貉', '賈復'],
    ['房宿', '房日兔', '耿弇'], ['心宿', '心月狐', '寇恂'], ['尾宿', '尾火虎', '岑彭'],
    ['箕宿', '箕水豹', '馮異'], ['斗宿', '斗木蠏', '朱祐'], ['牛宿', '牛金牛', '祭遵'],
    ['女宿', '女土蝠', '景丹'], ['虛宿', '虛日鼠', '蓋延'], ['危宿', '危月燕', '堅鐔'],
    ['室宿', '室火豬', '耿純'], ['壁宿', '壁水貐', '臧宮'], ['奎宿', '奎木狼', '馬武'],
    ['婁宿', '婁金狗', '劉隆'], ['胃宿', '胃土雉', '馬成'], ['昴宿', '昴日雞', '王良'],
    ['畢宿', '畢月烏', '陳俊'], ['觜宿', '觜火猴', '傅俊'], ['參宿', '參水猿', '杜茂'],
    ['井宿', '井木犴', '銚期'], ['鬼宿', '鬼金羊', '王霸'], ['柳宿', '柳土獐', '任光'],
    ['星宿', '星日馬', '李忠'], ['張宿', '張月鹿', '萬修'], ['翼宿', '翼火蛇', '邳彤'],
    ['軫宿', '軫水蚓', '劉植']
  ];

  let previousPosition = -1;
  for (const [mansion, animal, general] of rows) {
    const position = html.indexOf(`<td>${mansion}</td>`);
    assert.ok(position > previousPosition, `${mansion} must appear in canonical order`);
    assert.match(html.slice(position), new RegExp(`<td>${animal}<\\/td>\\s*<td>${general}<\\/td>`), `${mansion} mapping is incomplete`);
    previousPosition = position;
  }
  assert.match(html, /東方青龍/);
  assert.match(html, /北方玄武/);
  assert.match(html, /西方白虎/);
  assert.match(html, /南方朱雀/);
  assert.match(html, /星期/);
});

test('the Yanqin page explains the requested cycle and chart concepts without claiming an unfinished calculator', () => {
  const html = readFileSync('public/pages/yanqin-chart.html', 'utf8');
  for (const concept of ['七元起宿法', '60甲子', '420日', '四將', '值日星宿', '時禽']) {
    assert.match(html, new RegExp(concept), `missing ${concept}`);
  }
  assert.match(html, /原理說明/);
  assert.doesNotMatch(html, /id="calculate-chart"/);
});

