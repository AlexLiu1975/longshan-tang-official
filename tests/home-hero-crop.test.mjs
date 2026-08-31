import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage hero crop stops before the baked-in dashboard panels', () => {
  const ratio = html.match(/\.hero-final\s*\{[\s\S]*?aspect-ratio:\s*([0-9.]+)\s*\/\s*([0-9.]+)/);
  assert.ok(ratio, 'homepage should define an explicit hero crop ratio');
  const value = Number(ratio[1]) / Number(ratio[2]);
  assert.ok(value >= 3.7, `hero crop ratio ${value.toFixed(2)} is too tall and exposes the baked-in dashboard`);
});
