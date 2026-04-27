import Anthropic from '@anthropic-ai/sdk';

let instance: Anthropic | undefined;

export function getClient(): Anthropic {
  if (!instance) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Export it in your shell to enable AI features.',
      );
    }
    instance = new Anthropic({ apiKey });
  }
  return instance;
}

export const AI_MODEL = 'claude-opus-4-7' as const;
