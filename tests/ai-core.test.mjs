import assert from 'node:assert/strict';
import * as core from '../public/ai-core.js';

assert.equal(typeof core.getAiResponse, 'function', 'missing getAiResponse');
assert.equal(core.getAiResponse('最近神佛聖誕')['action'], '/pages/birthdays.html');
assert.equal(core.getAiResponse('有什麼最新公告')['action'], '/pages/news.html');
assert.equal(core.getAiResponse('我要問周文王先天易卦')['action'], '/pages/divination.html');
assert.match(core.getAiResponse('隴善堂在哪裡')['text'], /高雄市大寮區/);
assert.match(core.getAiResponse('觀音佛祖是誰')['text'], /信仰文化/);
assert.match(core.getAiResponse('亂碼問題')['text'], /目前 V1/);

console.log('PASS: AI response routing');
