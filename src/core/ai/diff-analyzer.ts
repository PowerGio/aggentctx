import type { FeatureBehavior } from '../features/types.js';
import { getClient, AI_MODEL } from './client.js';

export interface DiffAnalysis {
  changed: boolean;
  description: string;
  suggestedBehavior?: Omit<FeatureBehavior, 'date'>;
}

const SYSTEM_PROMPT = `You are an expert code reviewer who specializes in understanding how user-facing features behave.
Given a git diff, you detect whether the behavioral flow of a feature changed from the user's perspective.
Focus on observable behavior (what the user sees/does), not implementation details.
Always respond with valid JSON only — no markdown fences, no prose outside the JSON object.`;

export async function analyzeDiff(
  featureId: string,
  currentBehavior: FeatureBehavior,
  diff: string,
): Promise<DiffAnalysis> {
  if (!diff.trim()) {
    return { changed: false, description: 'No diff provided.' };
  }

  const client = getClient();

  const userMessage = `Feature: "${featureId}"

Current documented behavior:
${currentBehavior.flow.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${currentBehavior.returns ? `Returns: ${currentBehavior.returns}` : ''}

Git diff:
\`\`\`diff
${diff.slice(0, 12_000)}
\`\`\`

Does this diff change the user-facing behavior of this feature?
Respond with JSON in this exact shape:
{
  "changed": true | false,
  "description": "One sentence summary of what changed (or 'No behavioral change detected')",
  "suggestedBehavior": {
    "flow": ["step 1", "step 2", "..."],
    "returns": "what it returns/shows now (omit key if unchanged)",
    "notes": "any important caveats (omit key if none)",
    "reason": "why the behavior changed"
  }
}
If changed is false, omit the suggestedBehavior key entirely.`;

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    thinking: { type: 'enabled', budget_tokens: 1024 },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { changed: false, description: 'AI returned no text response.' };
  }

  try {
    const parsed = JSON.parse(textBlock.text) as {
      changed: boolean;
      description: string;
      suggestedBehavior?: Omit<FeatureBehavior, 'date'>;
    };
    return parsed;
  } catch {
    return { changed: false, description: 'Could not parse AI response.' };
  }
}
