import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const files = [
  ...walk('public'),
  ...walk('functions'),
  'firebase.json',
  '.firebaserc',
  '.gitignore',
  'docs/ai-v2-deployment.md'
].filter(file => fs.existsSync(file) && !file.includes('node_modules'));

assert.ok(fs.existsSync('docs/ai-v2-deployment.md'), 'missing AI deployment documentation');

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(!/sk-[A-Za-z0-9_-]{12,}/.test(text), `possible OpenAI API key in ${file}`);
  assert.ok(!/OPENAI_API_KEY\s*=\s*['"][^'"]+['"]/.test(text), `literal OPENAI_API_KEY string assignment in ${file}`);
}

const index = fs.readFileSync('functions/index.js', 'utf8');
assert.ok(index.includes("defineSecret('OPENAI_API_KEY')"), 'OPENAI_API_KEY must use Firebase defineSecret');
assert.ok(!fs.readFileSync('public/ai.js', 'utf8').includes('OPENAI_API_KEY'), 'frontend must not reference API key');

console.log('PASS: AI secret safety');
