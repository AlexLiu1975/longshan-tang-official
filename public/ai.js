import { getAiResponse } from '/ai-core.js';

const chat = document.querySelector('#ai-chat');
const input = document.querySelector('#ai-input');
const send = document.querySelector('#ai-send');

function appendMessage(role, text, action, actionLabel) {
  const row = document.createElement('div');
  row.className = `ai-message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  if (action) {
    const link = document.createElement('a');
    link.className = 'ai-action';
    link.href = action;
    link.textContent = actionLabel || '前往查看';
    row.appendChild(link);
  }
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function submitQuestion(question) {
  const text = String(question || '').trim();
  if (!text) return;
  appendMessage('user', text);
  const result = getAiResponse(text);
  appendMessage('assistant', result.text, result.action, result.actionLabel);
  input.value = '';
  input.focus();
}

send.addEventListener('click', () => submitQuestion(input.value));
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitQuestion(input.value);
  }
});

document.querySelectorAll('[data-question]').forEach((button) => {
  button.addEventListener('click', () => submitQuestion(button.dataset.question));
});

appendMessage('assistant', '您好，我是隴善堂 AI 智慧服務 V1。您可以詢問神佛聖誕、最新公告、隴善堂資訊、信仰文化，或前往周文王先天易卦。');
