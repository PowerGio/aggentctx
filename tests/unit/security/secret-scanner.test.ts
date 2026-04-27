import { describe, it, expect } from 'vitest';
import { SecretScanner } from '../../../src/security/secret-scanner.js';

describe('SecretScanner', () => {
  const scanner = new SecretScanner();

  it('detects AWS access keys', () => {
    const content = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const result = scanner.scan(content, 'config.env');
    expect(result.hasSecrets).toBe(true);
    expect(result.findings[0]?.pattern).toBe('AWS Access Key');
  });

  it('detects private key blocks', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...';
    const result = scanner.scan(content, 'cert.key');
    expect(result.hasSecrets).toBe(true);
  });

  it('detects connection strings with credentials', () => {
    const content = 'DATABASE_URL=postgres://admin:password123@db.example.com/mydb';
    const result = scanner.scan(content, 'settings.py');
    expect(result.hasSecrets).toBe(true);
  });

  it('returns no findings for clean content', () => {
    const content = `
# Configuration
DEBUG=true
PORT=3000
LOG_LEVEL=info
DATABASE_HOST=localhost
`;
    const result = scanner.scan(content, 'config.env');
    expect(result.hasSecrets).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('reports line numbers accurately', () => {
    const content = 'line1\nline2\nAKIAIOSFODNN7EXAMPLE\nline4';
    const result = scanner.scan(content, 'file.txt');
    expect(result.findings[0]?.line).toBe(3);
  });
});
