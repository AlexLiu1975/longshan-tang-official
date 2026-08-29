import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebase = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
assert.equal(firebase.functions.source, 'functions');
assert.ok(firebase.hosting.rewrites.some(item => item.source === '/api/ai' && item.function?.functionId === 'askLongshanAi'));

const pkg = JSON.parse(fs.readFileSync('functions/package.json', 'utf8'));
assert.equal(pkg.engines.node, '20');
assert.ok(pkg.dependencies['firebase-functions']);
assert.ok(pkg.dependencies.openai);

console.log('PASS: AI Functions config');
