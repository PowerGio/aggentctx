import { describe, it, expect } from 'vitest';
import { SensitiveFileFilter } from '../../../src/security/sensitive-files.js';

describe('SensitiveFileFilter', () => {
  const filter = new SensitiveFileFilter();

  it('detects .env files', () => {
    expect(filter.check('.env').sensitive).toBe(true);
    expect(filter.check('.env.production').sensitive).toBe(true);
    expect(filter.check('.env.local').sensitive).toBe(true);
  });

  it('detects key files', () => {
    expect(filter.check('id_rsa').sensitive).toBe(true);
    expect(filter.check('server.key').sensitive).toBe(true);
    expect(filter.check('cert.pem').sensitive).toBe(true);
  });

  it('detects terraform state', () => {
    expect(filter.check('terraform.tfstate').sensitive).toBe(true);
    expect(filter.check('terraform.tfstate.backup').sensitive).toBe(true);
  });

  it('allows safe files', () => {
    expect(filter.check('package.json').sensitive).toBe(false);
    expect(filter.check('README.md').sensitive).toBe(false);
    expect(filter.check('src/index.ts').sensitive).toBe(false);
  });

  it('respects user-defined extra patterns', () => {
    const customFilter = new SensitiveFileFilter(['my-secret\\.txt']);
    expect(customFilter.check('my-secret.txt').sensitive).toBe(true);
    expect(customFilter.check('package.json').sensitive).toBe(false);
  });

  it('filters an array of files', () => {
    const files = ['package.json', '.env', 'src/index.ts', 'id_rsa'];
    const safe = filter.filterSafe(files);
    expect(safe).toContain('package.json');
    expect(safe).toContain('src/index.ts');
    expect(safe).not.toContain('.env');
    expect(safe).not.toContain('id_rsa');
  });
});
