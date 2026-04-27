import * as p from '@clack/prompts';
import type { Reporter } from '../ui/reporter.js';
import type { Feature, FeatureBehavior } from '../core/features/types.js';
import { FeatureRegistryManager } from '../core/features/registry.js';

export class FeatureCommand {
  constructor(private readonly reporter: Reporter) {}

  async add(projectRoot: string): Promise<void> {
    const manager = new FeatureRegistryManager(projectRoot);

    p.intro('Document a new feature behavior');

    const answers = await p.group(
      {
        id: () =>
          p.text({
            message: 'Feature ID (kebab-case, e.g. upload-button)',
            placeholder: 'upload-button',
            validate: (v) => (!v.trim() ? 'Required' : undefined),
          }),

        files: () =>
          p.text({
            message: 'Related files (comma-separated, relative to project root)',
            placeholder: 'src/components/UploadButton.tsx, src/api/upload.ts',
            validate: (v) => (!v.trim() ? 'At least one file required' : undefined),
          }),

        flowRaw: () =>
          p.text({
            message: 'Describe the user flow step by step (use | to separate steps)',
            placeholder: '1. User clicks Upload | 2. Modal opens | 3. User fills field | 4. Returns data',
            validate: (v) => (!v.trim() ? 'Required' : undefined),
          }),

        returns: () =>
          p.text({
            message: 'What does it return/show? (optional)',
            placeholder: '{ customer: CustomerType, records: Record[] }',
          }),

        notes: () =>
          p.text({
            message: 'Any important notes? (optional)',
            placeholder: 'Requires auth. Field is the customer reference number.',
          }),
      },
      { onCancel: () => { p.cancel('Cancelled'); process.exit(0); } },
    );

    const today = new Date().toISOString().split('T')[0]!;
    const flow = (answers.flowRaw as string)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const current: FeatureBehavior = {
      flow,
      date: today,
      ...(answers.returns?.trim() ? { returns: answers.returns.trim() } : {}),
      ...(answers.notes?.trim()   ? { notes: answers.notes.trim() }     : {}),
    };

    const files = (answers.files as string).split(',').map((f) => f.trim()).filter(Boolean);

    const feature: Feature = {
      id: answers.id as string,
      files,
      status: 'active',
      current,
      history: [],
    };

    await manager.addFeature(feature);

    p.outro(`Feature "${feature.id}" documented in FEATURES.md`);
  }

  async update(projectRoot: string, featureId?: string): Promise<void> {
    const manager = new FeatureRegistryManager(projectRoot);
    const registry = await manager.load();

    if (registry.features.length === 0) {
      this.reporter.warn('No features documented yet. Run `agentctx feature add` first.');
      return;
    }

    p.intro('Update feature behavior');

    let id = featureId;

    if (!id) {
      const selected = await p.select({
        message: 'Which feature changed?',
        options: registry.features.map((f) => ({ value: f.id, label: f.id, hint: f.files.join(', ') })),
      });
      if (p.isCancel(selected)) { p.cancel('Cancelled'); return; }
      id = selected as string;
    }

    const existing = registry.features.find((f) => f.id === id);
    if (!existing) {
      this.reporter.error(`Feature "${id}" not found.`);
      return;
    }

    this.reporter.section(`Current behavior of "${id}"`);
    for (const step of existing.current.flow) {
      this.reporter.info(step);
    }
    if (existing.current.returns) this.reporter.info(`Returns: ${existing.current.returns}`);

    const answers = await p.group(
      {
        flowRaw: () =>
          p.text({
            message: 'New user flow (use | to separate steps)',
            placeholder: existing.current.flow.join(' | '),
            validate: (v) => (!v.trim() ? 'Required' : undefined),
          }),

        returns: () =>
          p.text({
            message: 'What does it return/show now? (optional)',
            placeholder: existing.current.returns ?? '',
          }),

        reason: () =>
          p.text({
            message: 'Why did this change? (helps the agent understand the evolution)',
            placeholder: 'Added modal to collect reference number before processing',
          }),
      },
      { onCancel: () => { p.cancel('Cancelled'); process.exit(0); } },
    );

    const today = new Date().toISOString().split('T')[0]!;
    const flow = (answers.flowRaw as string)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const newBehavior: FeatureBehavior = {
      flow,
      date: today,
      ...(answers.returns?.trim() ? { returns: answers.returns.trim() }   : {}),
      ...(answers.reason?.trim()  ? { reason: answers.reason.trim() }     : {}),
    };

    await manager.updateFeature(id, newBehavior);

    p.outro(`Feature "${id}" updated. Previous behavior preserved in history.`);
  }

  async list(projectRoot: string): Promise<void> {
    const manager = new FeatureRegistryManager(projectRoot);
    const registry = await manager.load();

    if (registry.features.length === 0) {
      this.reporter.info('No features documented. Run `agentctx feature add` to start.');
      return;
    }

    this.reporter.section(`Documented features (${registry.features.length})`);

    for (const feature of registry.features) {
      this.reporter.blank();
      this.reporter.success(`${feature.id} [${feature.status}]`);
      this.reporter.info(`  Files: ${feature.files.join(', ')}`);
      this.reporter.info(`  Updated: ${feature.current.date}`);
      this.reporter.info(`  Flow: ${feature.current.flow.length} steps`);
      if (feature.history.length > 0) {
        this.reporter.info(`  History: ${feature.history.length} previous version(s)`);
      }
    }
  }

  async check(projectRoot: string, changedFiles: string[]): Promise<void> {
    const manager = new FeatureRegistryManager(projectRoot);

    const affected = new Set<string>();
    for (const file of changedFiles) {
      const features = await manager.findByFile(file);
      for (const f of features) affected.add(f.id);
    }

    if (affected.size === 0) return;

    this.reporter.section('Feature behavior check');
    this.reporter.warn('These features have related files that changed:');
    for (const id of affected) {
      this.reporter.info(`  → ${id}`);
    }
    this.reporter.info('Claude Code will review .agentctx/pending-review.md and update FEATURES.md automatically.');
  }
}
