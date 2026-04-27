import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureBehavior, FeatureRegistry } from './types.js';
import { serialize, parse } from './parser.js';

const FEATURES_FILE = 'FEATURES.md';

export class FeatureRegistryManager {
  private readonly featuresPath: string;

  constructor(private readonly projectRoot: string) {
    this.featuresPath = path.join(projectRoot, FEATURES_FILE);
  }

  async load(): Promise<FeatureRegistry> {
    try {
      const content = await fs.readFile(this.featuresPath, 'utf-8');
      return parse(content);
    } catch {
      return { features: [], lastUpdated: new Date().toISOString() };
    }
  }

  async save(registry: FeatureRegistry): Promise<void> {
    await fs.writeFile(this.featuresPath, serialize(registry), 'utf-8');
  }

  async addFeature(feature: Feature): Promise<void> {
    const registry = await this.load();
    const exists = registry.features.some((f) => f.id === feature.id);
    if (exists) {
      throw new Error(`Feature "${feature.id}" already exists. Use 'update' to modify it.`);
    }
    await this.save({ ...registry, features: [...registry.features, feature] });
  }

  async updateFeature(
    id: string,
    newBehavior: FeatureBehavior,
    updatedFiles?: string[],
  ): Promise<void> {
    const registry = await this.load();
    const existing = registry.features.find((f) => f.id === id);

    if (!existing) {
      throw new Error(`Feature "${id}" not found. Use 'add' to create it first.`);
    }

    const updated: Feature = {
      ...existing,
      ...(updatedFiles ? { files: updatedFiles } : {}),
      current: newBehavior,
      history: [existing.current, ...existing.history],
    };

    const features = registry.features.map((f) => (f.id === id ? updated : f));
    await this.save({ ...registry, features });
  }

  async getFeature(id: string): Promise<Feature | undefined> {
    const registry = await this.load();
    return registry.features.find((f) => f.id === id);
  }

  async findByFile(filePath: string): Promise<Feature[]> {
    const registry = await this.load();
    const normalized = filePath.replace(/\\/g, '/');
    return registry.features.filter((f) =>
      f.files.some((file) => file.replace(/\\/g, '/') === normalized || normalized.endsWith(file)),
    );
  }
}
