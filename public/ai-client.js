import { getAiResponse } from './ai-core.js';

const SITE_FACT_QUERY = /地址|在哪|位置|電話|聯絡|地圖|導航|google\s*maps?|社群|line/i;

export async function requestAiAnswer(message, { fetchImpl = fetch, fallback = getAiResponse } = {}) {
  const text = String(message || '').trim();
  if (!text) {
    const result = fallback(text);
    return { answer: result.text, action: result.action, actionLabel: result.actionLabel, fallback: true };
  }

  // 隴善堂地址、電話、地圖等官方固定資訊，直接使用站內已核對資料，避免 AI 臆測或回答不知道。
  if (SITE_FACT_QUERY.test(text)) {
    const result = fallback(text);
    return { answer: result.text, action: result.action, actionLabel: result.actionLabel, fallback: false };
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
