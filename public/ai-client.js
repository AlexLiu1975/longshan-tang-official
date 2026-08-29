import { getAiResponse } from './ai-core.js';

export async function requestAiAnswer(message, { fetchImpl = fetch, fallback = getAiResponse } = {}) {
  const text = String(message || '').trim();
  if (!text) {
    const result = fallback(text);
    return { answer: result.text, action: result.action, actionLabel: result.actionLabel, fallback: true };
  }

  try {
    const response = await fetchImpl('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    if (!response?.ok) throw new Error('AI_HTTP_ERROR');
    const payload = await response.json();
    const answer = typeof payload?.answer === 'string' ? payload.answer.trim() : '';
    if (payload?.ok !== true || !answer) throw new Error('INVALID_AI_PAYLOAD');
    return { answer, fallback: false };
  } catch {
    const result = fallback(text);
    return { answer: result.text, action: result.action, actionLabel: result.actionLabel, fallback: true };
  }
}
