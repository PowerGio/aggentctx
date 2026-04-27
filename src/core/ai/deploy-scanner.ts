import { getClient, AI_MODEL } from './client.js';

export interface DetectedDeployCommand {
  environment: string;
  command: string;
  envVars: string[];
  notes?: string;
}

const SYSTEM_PROMPT = `You are a DevOps expert who reads project files and extracts deployment commands.
Look for deploy targets in Makefiles, npm scripts, shell scripts, GitHub Actions, GitLab CI, and Dockerfiles.
Replace any hardcoded credentials with $ENV_VAR_NAME placeholders and list those env vars.
Always respond with valid JSON only — no markdown fences, no prose outside the JSON array.`;

export async function scanFilesForDeploys(
  files: Array<{ name: string; content: string }>,
): Promise<DetectedDeployCommand[]> {
  if (files.length === 0) return [];

  const client = getClient();

  const fileSection = files
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content.slice(0, 4_000)}\n\`\`\``)
    .join('\n\n');

  const userMessage = `Analyze these project files and extract any deployment commands you find:

${fileSection}

Respond with a JSON array. Each item must match this shape exactly:
[
  {
    "environment": "production | staging | development | <custom name>",
    "command": "the deploy command with $ENV_VAR placeholders for credentials",
    "envVars": ["LIST_OF_VAR_NAMES"],
    "notes": "optional: any important info about this deploy step"
  }
]

If no deploy commands are found, return an empty array: []
Omit the "notes" key when there is nothing notable to add.`;

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
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
  if (!textBlock || textBlock.type !== 'text') return [];

  try {
    const parsed = JSON.parse(textBlock.text) as DetectedDeployCommand[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
