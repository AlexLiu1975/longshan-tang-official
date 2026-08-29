import { buildInstructions } from './ai-policy.js';

export async function askOpenAi({ client, message, model }) {
  const response = await client.responses.create({
    model,
    instructions: buildInstructions(),
    input: message,
    max_output_tokens: 500
  });
  const answer = response.output_text?.trim();
  if (!answer) throw new Error('EMPTY_AI_RESPONSE');
  return answer;
}
