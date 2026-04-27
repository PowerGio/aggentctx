export interface FeatureBehavior {
  readonly flow: readonly string[];
  readonly returns?: string;
  readonly notes?: string;
  readonly date: string;
  readonly reason?: string;
}

export interface Feature {
  readonly id: string;
  readonly files: readonly string[];
  readonly status: 'active' | 'deprecated' | 'wip';
  readonly current: FeatureBehavior;
  readonly history: readonly FeatureBehavior[];
}

export interface FeatureRegistry {
  readonly features: readonly Feature[];
  readonly lastUpdated: string;
}
