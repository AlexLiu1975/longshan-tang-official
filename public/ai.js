import { requestAiAnswer } from '/ai-client.js';

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
  return { row, bubble };
}

function setBusy(busy) {
  input.disabled = busy;
  send.disabled = busy;
  send.textContent = busy ? '請稍候…' : '送出';
}

async function submitQuestion(question) {
  const text = String(question || '').trim();
  if (!text || send.disabled) return;

  appendMessage('user', text);
  input.value = '';
  setBusy(true);
  const pending = appendMessage('assistant', '正在整理資料…');

  const result = await requestAiAnswer(text);
  pending.row.remove();
  const prefix = result.fallback ? 'AI 智慧回答目前暫時無法使用，已切換為網站智慧導覽。\n\n' : '';
  appendMessage('assistant', `${prefix}${result.answer}`, result.action, result.actionLabel);

  setBusy(false);
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

appendMessage('assistant', '您好，我是隴善堂 AI 智慧服務 V2。您可以直接詢問佛道文化、神佛典故與網站服務；若 AI 服務暫時無法使用，系統會自動切換為網站智慧導覽。');
