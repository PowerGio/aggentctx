import path from 'node:path';

interface SensitivePattern {
  readonly pattern: RegExp;
  readonly reason: string;
  readonly severity: 'critical' | 'high' | 'medium';
}

const SENSITIVE_PATTERNS: readonly SensitivePattern[] = [
  { severity: 'critical', pattern: /^\.env$/i,                       reason: 'Environment variables' },
  { severity: 'critical', pattern: /^\.env\..+$/i,                   reason: 'Environment variables' },
  { severity: 'critical', pattern: /\.pem$/i,                        reason: 'PEM certificate/key' },
  { severity: 'critical', pattern: /\.key$/i,                        reason: 'Private key file' },
  { severity: 'critical', pattern: /\.(p12|pfx|crt|cer|der)$/i,      reason: 'Certificate file' },
  { severity: 'critical', pattern: /^id_(rsa|ed25519|ecdsa|dsa)$/i,  reason: 'SSH private key' },
  { severity: 'critical', pattern: /\.tfstate(\.backup)?$/i,         reason: 'Terraform state (contains secrets)' },
  { severity: 'critical', pattern: /service-account.*\.json$/i,      reason: 'GCP service account key' },
  { severity: 'high',     pattern: /^\.kube\/config$/i,              reason: 'Kubernetes config with tokens' },
  { severity: 'high',     pattern: /kubeconfig.*$/i,                 reason: 'Kubernetes config' },
  { severity: 'high',     pattern: /\.tfvars$/i,                     reason: 'Terraform variables' },
  { severity: 'high',     pattern: /^\.npmrc$/i,                     reason: 'npm config (may contain auth token)' },
  { severity: 'high',     pattern: /^\.netrc$/i,                     reason: 'Network credentials' },
  { severity: 'high',     pattern: /^\.git-credentials$/i,           reason: 'Git credentials' },
  { severity: 'high',     pattern: /secrets\.(yml|yaml)$/i,          reason: 'Secrets file' },
  { severity: 'high',     pattern: /database\.yml$/i,                reason: 'Database config (may have passwords)' },
  { severity: 'high',     pattern: /wp-config\.php$/i,               reason: 'WordPress config with DB credentials' },
  { severity: 'high',     pattern: /^\.vault-token$/i,               reason: 'HashiCorp Vault token' },
  { severity: 'high',     pattern: /\.(sql|dump)$/i,                 reason: 'Database dump' },
  { severity: 'high',     pattern: /\.(sqlite|db)$/i,                reason: 'Database file' },
  { severity: 'medium',   pattern: /\.(jks|keystore)$/i,             reason: 'Java KeyStore' },
];

export interface SensitiveCheckResult {
  readonly sensitive: boolean;
  readonly reason?: string;
  readonly severity?: 'critical' | 'high' | 'medium';
}

export class SensitiveFileFilter {
  private readonly extraPatterns: readonly RegExp[];

  constructor(extraPatterns: string[] = []) {
    this.extraPatterns = extraPatterns.map((p) => new RegExp(p, 'i'));
  }

  check(filePath: string): SensitiveCheckResult {
    const basename = path.basename(filePath);
    const normalized = filePath.replace(/\\/g, '/');

    for (const { pattern, reason, severity } of SENSITIVE_PATTERNS) {
      if (pattern.test(basename) || pattern.test(normalized)) {
        return { sensitive: true, reason, severity };
      }
    }

    for (const pattern of this.extraPatterns) {
      if (pattern.test(basename) || pattern.test(normalized)) {
        return { sensitive: true, reason: 'User-defined exclusion', severity: 'high' };
      }
    }

    return { sensitive: false };
  }

  filterSafe(files: string[]): string[] {
    return files.filter((file) => {
      const result = this.check(file);
      if (result.sensitive) {
        console.warn(
          `[agentctx] Excluding sensitive file [${result.severity?.toUpperCase()}]: ${file} (${result.reason})`
        );
        return false;
      }
      return true;
    });
  }
}
