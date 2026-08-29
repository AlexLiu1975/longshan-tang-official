import { AiInputError, validateMessage } from './validation.js';

function safeAiErrorDetails(error) {
  const status = Number.isInteger(error?.status) ? error.status : null;
  const code = typeof error?.code === 'string' ? error.code : null;
  const type = typeof error?.type === 'string'
    ? error.type
    : (typeof error?.error?.type === 'string' ? error.error.type : null);
  return { status, code, type };
}

export function createAiHttpHandler({ ask }) {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    if (!req.is?.('application/json')) return res.status(415).json({ ok: false, error: 'UNSUPPORTED_MEDIA_TYPE' });
    try {
      const message = validateMessage(req.body?.message);
      const answer = await ask(message);
      return res.status(200).json({ ok: true, answer });
    } catch (error) {
      if (error instanceof AiInputError) return res.status(400).json({ ok: false, error: 'INVALID_MESSAGE' });
      console.error('AI service error', safeAiErrorDetails(error));
      return res.status(503).json({ ok: false, error: 'AI_SERVICE_UNAVAILABLE' });
    }
  };
}
