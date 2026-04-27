import { describe, it, expect } from 'vitest';
import { serialize, parse } from '../../../src/core/features/parser.js';
import type { Feature, FeatureRegistry } from '../../../src/core/features/types.js';

const baseFeature: Feature = {
  id: 'upload-button',
  files: ['src/components/UploadButton.tsx', 'src/api/upload.ts'],
  status: 'active',
  current: {
    flow: ['1. User clicks Upload', '2. Modal opens', '3. User selects file', '4. Returns data'],
    date: '2026-04-22',
    returns: '{ file: FileType }',
    notes: 'Requires auth',
  },
  history: [],
};

describe('parser — serialize', () => {
  it('includes the FEATURES.md header', () => {
    const out = serialize({ features: [], lastUpdated: '' });
    expect(out).toContain('# FEATURES.md');
    expect(out).toContain('Managed by agentctx');
  });

  it('serializes a single feature with all fields', () => {
    const out = serialize({ features: [baseFeature], lastUpdated: '' });
    expect(out).toContain('## upload-button');
    expect(out).toContain('src/components/UploadButton.tsx');
    expect(out).toContain('**Updated:** 2026-04-22');
    expect(out).toContain('### Current behavior');
    expect(out).toContain('1. User clicks Upload');
    expect(out).toContain('**Returns:** `{ file: FileType }`');
    expect(out).toContain('**Notes:** Requires auth');
  });

  it('marks deprecated features with a badge', () => {
    const deprecated: Feature = { ...baseFeature, id: 'old-feature', status: 'deprecated' };
    const out = serialize({ features: [deprecated], lastUpdated: '' });
    expect(out).toContain('*(deprecated)*');
  });

  it('does not include history section when history is empty', () => {
    const out = serialize({ features: [baseFeature], lastUpdated: '' });
    expect(out).not.toContain('### History');
  });

  it('serializes history when present', () => {
    const withHistory: Feature = {
      ...baseFeature,
      history: [{
        flow: ['1. Old step A', '2. Old step B'],
        date: '2026-01-01',
        reason: 'Changed approach',
      }],
    };
    const out = serialize({ features: [withHistory], lastUpdated: '' });
    expect(out).toContain('### History');
    expect(out).toContain('#### 2026-01-01');
    expect(out).toContain('Old step A');
    expect(out).toContain('**Reason for change:** Changed approach');
  });

  it('separates multiple features with ---', () => {
    const second: Feature = { ...baseFeature, id: 'login-form' };
    const out = serialize({ features: [baseFeature, second], lastUpdated: '' });
    expect(out).toContain('\n---\n');
  });
});

describe('parser — parse', () => {
  it('returns empty registry for empty content', () => {
    const result = parse('');
    expect(result.features).toHaveLength(0);
  });

  it('returns empty registry for content without features', () => {
    const result = parse('# FEATURES.md\nSome text\n');
    expect(result.features).toHaveLength(0);
  });

  it('parses a serialized feature back correctly (roundtrip)', () => {
    const registry: FeatureRegistry = { features: [baseFeature], lastUpdated: '' };
    const roundtrip = parse(serialize(registry));

    expect(roundtrip.features).toHaveLength(1);
    const f = roundtrip.features[0]!;
    expect(f.id).toBe('upload-button');
    expect(f.files).toContain('src/components/UploadButton.tsx');
    expect(f.current.flow).toHaveLength(4);
    expect(f.current.returns).toBe('{ file: FileType }');
    expect(f.current.notes).toBe('Requires auth');
  });

  it('parses multiple features', () => {
    const second: Feature = { ...baseFeature, id: 'login-form', files: ['src/Login.tsx'] };
    const registry: FeatureRegistry = { features: [baseFeature, second], lastUpdated: '' };
    const result = parse(serialize(registry));
    expect(result.features).toHaveLength(2);
    expect(result.features.map((f) => f.id)).toContain('login-form');
  });

  it('parses history entries (roundtrip)', () => {
    const withHistory: Feature = {
      ...baseFeature,
      history: [{ flow: ['Old step'], date: '2026-01-01', reason: 'Redesign' }],
    };
    const result = parse(serialize({ features: [withHistory], lastUpdated: '' }));
    const f = result.features[0]!;
    expect(f.history).toHaveLength(1);
    expect(f.history[0]!.date).toBe('2026-01-01');
    expect(f.history[0]!.reason).toBe('Redesign');
  });

  it('defaults to active status when not marked', () => {
    const result = parse(serialize({ features: [baseFeature], lastUpdated: '' }));
    expect(result.features[0]!.status).toBe('active');
  });
});
