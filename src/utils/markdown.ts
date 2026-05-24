/**
 * Extract the body of a markdown section by heading name.
 * Returns everything from after the heading until the next heading at the same or higher level.
 */
export function extractSection(
  content: string,
  heading: string,
  level: 1 | 2 | 3 = 2,
): string | null {
  const hashes = '#'.repeat(level);
  const headingPrefix = `${hashes} `;
  const lines = content.split('\n');

  const startIdx = lines.findIndex((l) => {
    const trimmed = l.trimEnd();
    return trimmed === `${hashes} ${heading}` || trimmed.startsWith(`${hashes} ${heading}`);
  });

  if (startIdx === -1) return null;

  const stopRe = new RegExp(`^#{1,${level}} `);
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (stopRe.test(lines[i]!)) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx + 1, endIdx).join('\n').trimEnd();
}

/** Extract the content of the first ```bash block in a string. */
export function extractFirstBashBlock(content: string): string | null {
  const match = content.match(/```bash\n([\s\S]*?)```/);
  return match ? (match[1] ?? '').trim() : null;
}

/** Extract all ``` bash blocks from a string. */
export function extractAllBashBlocks(content: string): string[] {
  const blocks: string[] = [];
  const re = /```bash\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const block = (m[1] ?? '').trim();
    if (block) blocks.push(block);
  }
  return blocks;
}

/** Extract bullet-list items (lines starting with - or *) from a string. */
export function extractBulletList(content: string): string[] {
  return content
    .split('\n')
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

/** Truncate a string to at most maxChars, appending '…' if cut. */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + '…';
}
