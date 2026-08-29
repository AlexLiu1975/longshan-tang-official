import OpenAI from 'openai';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { askOpenAi } from './lib/openai-adapter.js';
import { createAiHttpHandler } from './lib/http-handler.js';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const MODEL = 'gpt-5.6-luna';

export const askLongshanAi = onRequest(
  { region: 'asia-east1', secrets: [OPENAI_API_KEY], timeoutSeconds: 30 },
  createAiHttpHandler({
    ask: async message => {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
      return askOpenAi({ client, message, model: MODEL });
    }
  })
);
