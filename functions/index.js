import { onRequest } from 'firebase-functions/v2/https';

export const askLongshanAi = onRequest((req, res) => {
  res.status(503).json({ ok: false, error: 'AI_SERVICE_UNAVAILABLE' });
});
