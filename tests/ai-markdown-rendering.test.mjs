import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('public/ai.js', 'utf8');
assert.ok(source.includes('function renderAssistantText'), 'missing safe assistant formatter');
assert.ok(source.includes("document.createElement('strong')"), 'bold markdown must create strong nodes');
assert.ok(source.includes("document.createElement('ul')"), 'bullet markdown must create list nodes');
assert.ok(source.includes("text.split('\\n')"), 'formatter must preserve line breaks');
assert.ok(!source.includes('innerHTML'), 'AI output must not use innerHTML');
assert.ok(source.includes("role === 'assistant'"), 'formatter should apply only to assistant messages');
console.log('PASS: safe AI markdown rendering');
