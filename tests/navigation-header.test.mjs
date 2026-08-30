import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pages = [
  'public/index.html',
  'public/pages/about.html',
  'public/pages/news.html',
  'public/pages/birthdays.html',
  'public/pages/ai.html',
  'public/pages/divination.html',
  'public/pages/contact.html'
];

const navigationLinks = [
  ['首頁', '/'],
  ['認識隴善堂', '/pages/about.html'],
  ['最新公告', '/pages/news.html'],
  ['神佛聖誕', '/pages/birthdays.html'],
  ['AI 智慧服務', '/pages/ai.html'],
  ['線上抽籤', '/pages/divination.html'],
  ['聯絡我們', '/pages/contact.html']
];

test('every public page exposes the complete linked site navigation', () => {
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /<header class="site-header"/, `${page} needs the shared header`);
    assert.match(html, /<nav[^>]+class="main-nav"/, `${page} needs the main navigation`);
    for (const [label, href] of navigationLinks) {
      assert.match(html, new RegExp(`<a[^>]+href="${href.replaceAll('.', '\\.') }"[^>]*>${label}<\\/a>`), `${page} needs a working ${label} link`);
    }
    assert.match(html, /<script src="\/navigation\.js"><\/script>/, `${page} needs the shared navigation behavior`);
  }
});

test('shared header styles define scroll, hover, mobile, and reduced-motion states', () => {
  const css = readFileSync('public/brand-calligraphy.css', 'utf8');
  assert.match(css, /\.site-header\.is-scrolled/);
  assert.match(css, /\.main-nav a::after/);
  assert.match(css, /\.main-nav a:hover::after/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.site-header\.is-scrolled \.main-nav\.open\{display:flex\}/);
});

test('navigation behavior toggles the scrolled header state', () => {
  const script = readFileSync('public/navigation.js', 'utf8');
  assert.match(script, /classList\.toggle\(['"]is-scrolled['"]/);
  assert.match(script, /scrollY/);
  assert.match(script, /aria-expanded/);
});
