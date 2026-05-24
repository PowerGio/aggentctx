import fs from 'node:fs/promises';
import path from 'node:path';
import type { Reporter } from '../ui/reporter.js';
import { FeatureRegistryManager } from '../core/features/registry.js';
import { analyzeDiff } from '../core/ai/diff-analyzer.js';

const PENDING_REVIEW = '.agentctx/pending-review.md';

export class ReviewCommand {
  constructor(private readonly reporter: Reporter) {}

  async execute(projectRoot: string): Promise<void> {
    const reviewFile = path.join(projectRoot, PENDING_REVIEW);

    let reviewContent: string;
    try {
      reviewContent = await fs.readFile(reviewFile, 'utf-8');
    } catch {
      this.reporter.info('No pending review found (.agentctx/pending-review.md).');
      return;
    }

    const changedFiles = parseChangedFiles(reviewContent);
    const diff = parseDiff(reviewContent);

    if (!changedFiles.length) {
      this.reporter.warn('No changed files found in pending-review.md.');
      await fs.unlink(reviewFile);
      return;
    }

    const manager = new FeatureRegistryManager(projectRoot);

    const affected = new Map<string, true>();
    for (const file of changedFiles) {
      const features = await manager.findByFile(file);
      for (const f of features) affected.set(f.id, true);
    }

    if (affected.size === 0) {
      this.reporter.info('No documented features are affected by the changed files.');
      await fs.unlink(reviewFile);
      return;
    }

    this.reporter.section(`Reviewing ${affected.size} affected feature(s)`);

    if (!diff.trim()) {
      this.reporter.warn('Diff is empty — skipping AI analysis.');
      await fs.unlink(reviewFile);
      return;
    }

    const registry = await manager.load();
    let updatedCount = 0;

    for (const featureId of affected.keys()) {
      const feature = registry.features.find((f) => f.id === featureId);
      if (!feature) continue;

      this.reporter.info(`  Analyzing "${featureId}"...`);

      let analysis;
      try {
        analysis = await analyzeDiff(featureId, feature.current, diff);
      } catch (e) {
        this.reporter.warn(`  Could not analyze "${featureId}": ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }

      if (analysis.changed && analysis.suggestedBehavior) {
        const today = new Date().toISOString().split('T')[0]!;
        const newBehavior = { ...analysis.suggestedBehavior, date: today };
        await manager.updateFeature(featureId, newBehavior);
        this.reporter.success(`  Updated "${featureId}": ${analysis.description}`);
        updatedCount++;
      } else {
        this.reporter.info(`  No behavioral change in "${featureId}".`);
      }
    }

    await fs.unlink(reviewFile);

    if (updatedCount > 0) {
      this.reporter.success(`FEATURES.md updated — ${updatedCount} feature(s) changed.`);
    } else {
      this.reporter.info('Review complete. No features required updates.');
    }
  }
}

function parseChangedFiles(content: string): string[] {
  const section = content.match(/## Changed files\n([\s\S]*?)(?=\n## |\n```|$)/);
  if (!section) return [];
  return section[1]
    .split('\n')
    .map((l) => l.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function parseDiff(content: string): string {
  const match = content.match(/```diff\n([\s\S]*?)```/);
  return match ? match[1] : '';
}
