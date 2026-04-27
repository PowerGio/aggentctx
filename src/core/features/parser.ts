import type { Feature, FeatureBehavior, FeatureRegistry } from './types.js';

const HEADER = `# FEATURES.md — Feature Behavior Registry

> Managed by agentctx. Documents how each feature behaves from the user's perspective.
> Agents must read this before modifying listed files to avoid breaking existing flows.

`;

export function serialize(registry: FeatureRegistry): string {
  const sections = registry.features.map(serializeFeature).join('\n---\n\n');
  return HEADER + sections;
}

function serializeFeature(feature: Feature): string {
  const filesStr = feature.files.join(', ');
  const statusBadge = feature.status !== 'active' ? ` *(${feature.status})*` : '';

  let out = `## ${feature.id}${statusBadge}\n\n`;
  out += `**Files:** \`${filesStr}\`\n`;
  out += `**Updated:** ${feature.current.date}\n\n`;
  out += `### Current behavior\n\n`;
  out += serializeBehavior(feature.current);

  if (feature.history.length > 0) {
    out += `\n### History\n\n`;
    for (const past of feature.history) {
      out += `#### ${past.date}\n\n`;
      out += serializeBehavior(past);
    }
  }

  return out;
}

function serializeBehavior(behavior: FeatureBehavior): string {
  let out = `**Flow:**\n`;
  for (const step of behavior.flow) {
    out += `${step}\n`;
  }

  if (behavior.returns) {
    out += `\n**Returns:** \`${behavior.returns}\`\n`;
  }
  if (behavior.notes) {
    out += `\n**Notes:** ${behavior.notes}\n`;
  }
  if (behavior.reason) {
    out += `\n**Reason for change:** ${behavior.reason}\n`;
  }

  return out + '\n';
}

export function parse(content: string): FeatureRegistry {
  const features: Feature[] = [];
  const sections = content.split(/\n---\n/);

  for (const section of sections) {
    const feature = parseFeature(section.trim());
    if (feature) features.push(feature);
  }

  return { features, lastUpdated: new Date().toISOString() };
}

function parseFeature(section: string): Feature | null {
  const headerMatch = /(?:^|\n)## ([^\n*(]+)/.exec(section);
  if (!headerMatch) return null;

  const id = headerMatch[1]!.trim();
  const filesMatch = /\*\*Files:\*\* `([^`]+)`/.exec(section);
  const files = filesMatch ? filesMatch[1]!.split(', ').map((f) => f.trim()) : [];
  const statusMatch = /\*(active|deprecated|wip)\*/.exec(section);
  const status = (statusMatch?.[1] as Feature['status']) ?? 'active';
  const updatedMatch = /\*\*Updated:\*\* ([^\n]+)/.exec(section);
  const date = updatedMatch?.[1]?.trim() ?? new Date().toISOString().split('T')[0]!;

  const currentSection = section.match(/### Current behavior\n\n([\s\S]*?)(?=\n### History|\n---\n|$)/);
  if (!currentSection?.[1]) return null;

  const current = parseBehavior(currentSection[1], date);

  const historySection = section.match(/### History\n\n([\s\S]*?)$/);
  const history: FeatureBehavior[] = [];

  if (historySection?.[1]) {
    const entries = historySection[1].split(/\n#### /);
    for (const entry of entries) {
      if (!entry.trim()) continue;
      const cleanEntry = entry.replace(/^#### /, '');
      const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(cleanEntry);
      const entryDate = dateMatch?.[1] ?? 'unknown';
      const parsed = parseBehavior(cleanEntry.replace(/^\S+\n/, ''), entryDate);
      history.push(parsed);
    }
  }

  return { id, files, status, current, history };
}

function parseBehavior(content: string, date: string): FeatureBehavior {
  const flowMatch = content.match(/\*\*Flow:\*\*\n([\s\S]*?)(?=\n\*\*|\n\n\*\*|$)/);
  const flow = flowMatch
    ? flowMatch[1]!.split('\n').map((l) => l.trim()).filter(Boolean)
    : [];

  const returnsMatch = /\*\*Returns:\*\* `([^`]+)`/.exec(content);
  const notesMatch   = /\*\*Notes:\*\* ([^\n]+)/.exec(content);
  const reasonMatch  = /\*\*Reason for change:\*\* ([^\n]+)/.exec(content);

  return {
    flow,
    date,
    ...(returnsMatch?.[1] ? { returns: returnsMatch[1] } : {}),
    ...(notesMatch?.[1]   ? { notes: notesMatch[1] }     : {}),
    ...(reasonMatch?.[1]  ? { reason: reasonMatch[1] }   : {}),
  };
}
