interface SecretPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly severity: 'critical' | 'high' | 'medium';
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  { name: 'AWS Access Key',       severity: 'critical', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GCP API Key',          severity: 'critical', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Stripe Live Key',      severity: 'critical', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Stripe Test Key',      severity: 'high',     pattern: /sk_test_[0-9a-zA-Z]{24,}/ },
  { name: 'GitHub Token',         severity: 'critical', pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/ },
  { name: 'NPM Token',            severity: 'critical', pattern: /npm_[A-Za-z0-9]{36}/ },
  { name: 'Slack Token',          severity: 'critical', pattern: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'OpenAI Key',           severity: 'critical', pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'Anthropic Key',        severity: 'critical', pattern: /sk-ant-[A-Za-z0-9_-]{40,}/ },
  { name: 'SendGrid Key',         severity: 'high',     pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/ },
  { name: 'HuggingFace Token',    severity: 'high',     pattern: /hf_[A-Za-z0-9]{37}/ },
  { name: 'Generic Password Env', severity: 'high',     pattern: /(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|APIKEY|AUTH)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?/i },
  { name: 'Connection String',    severity: 'high',     pattern: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^:]+:[^@]+@/i },
  { name: 'Private Key Block',    severity: 'critical', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Basic Auth in URL',    severity: 'high',     pattern: /https?:\/\/[^:]+:[^@]{4,}@/ },
];

export interface SecretFinding {
  readonly pattern: string;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly line: number;
}

export interface ScanResult {
  readonly hasSecrets: boolean;
  readonly findings: readonly SecretFinding[];
}

export class SecretScanner {
  scan(content: string, filePath: string): ScanResult {
    const lines = content.split('\n');
    const findings: SecretFinding[] = [];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx] ?? '';

      for (const { name, pattern, severity } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({ pattern: name, severity, line: lineIdx + 1 });
        }
        pattern.lastIndex = 0;
      }
    }

    if (findings.length > 0) {
      console.warn(
        `[agentctx] SECURITY: Found ${findings.length} potential secret(s) in "${filePath}". Excluding file.`
      );
      for (const f of findings) {
        console.warn(`  Line ${f.line}: ${f.pattern} [${f.severity.toUpperCase()}]`);
      }
    }

    return { hasSecrets: findings.length > 0, findings };
  }
}
