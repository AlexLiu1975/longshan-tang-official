export class AiInputError extends Error {}

export function validateMessage(value) {
  if (typeof value !== 'string') throw new AiInputError('INVALID_MESSAGE');
  const message = value.trim();
  if (!message) throw new AiInputError('EMPTY_MESSAGE');
  if ([...message].length > 800) throw new AiInputError('MESSAGE_TOO_LONG');
  return message;
}
