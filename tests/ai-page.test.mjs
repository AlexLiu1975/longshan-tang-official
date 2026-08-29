import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/pages/ai.html', 'utf8');

for (const id of ['ai-culture', 'ai-birthdays', 'ai-news', 'ai-guide', 'ai-divination', 'ai-chat', 'ai-input', 'ai-send']) {
  assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
}

for (const text of ['AI 信仰文化問答', '神佛聖誕查詢', '最新公告與活動', '隴善堂網站導覽', '周文王先天易卦']) {
  assert.ok(html.includes(text), `missing ${text}`);
}

assert.ok(html.includes('/ai.css'), 'missing AI stylesheet');
assert.ok(html.includes('/ai.js'), 'missing AI script');
assert.ok(html.includes('AI 提供文化資訊與網站導覽，不代表神明指示'), 'missing AI disclaimer');
assert.ok(html.includes('/pages/divination.html'), 'missing divination link');
assert.ok(html.includes('/pages/birthdays.html'), 'missing birthdays link');
assert.ok(html.includes('/pages/news.html'), 'missing news link');

console.log('PASS: AI smart service page structure');
