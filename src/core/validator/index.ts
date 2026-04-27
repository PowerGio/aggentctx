import fs from 'node:fs/promises';
import path from 'node:path';
import type { ValidationResult, ValidationError, ContextFile } from '../../types/index.js';

const REQUIRED_SECTIONS: Record<ContextFile, string[]> = {
  'AGENTS.md': ['## Project Overview', '## Agent Workflow'],
  'CLAUDE.md': ['## Project'],
  'DESIGN.md': ['# DESIGN.md'],
};

const PLACEHOLDER_PATTERN = /<!--\s*Add\s+.+?\s*here\s*-->/gi;

export class ContextValidator {
  async validateFile(filePath: string): Promise<ValidationResult> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      return {
        file: filePath,
        isValid: false,
        errors: [{ code: 'FILE_NOT_FOUND', message: `File not found: ${filePath}`, file: filePath, severity: 'error' }],
        warnings: [],
        score: 0,
      };
    }

    const filename = path.basename(filePath) as ContextFile;
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const requiredSections = REQUIRED_SECTIONS[filename] ?? [];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        errors.push({
          code: 'MISSING_SECTION',
          message: `Required section "${section}" not found`,
          file: filePath,
          severity: 'error',
          suggestion: `Add a "${section}" section to the file`,
        });
      }
    }

    const placeholders = content.match(PLACEHOLDER_PATTERN);
    if (placeholders) {
      for (const placeholder of placeholders) {
        warnings.push({
          code: 'EMPTY_PLACEHOLDER',
          message: `Unfilled placeholder: ${placeholder}`,
          file: filePath,
          severity: 'warning',
          suggestion: 'Replace this placeholder with actual content',
        });
      }
    }

    if (content.length < 100) {
      warnings.push({
        code: 'SPARSE_CONTENT',
        message: 'Context file is very short — consider adding more detail',
        file: filePath,
        severity: 'warning',
      });
    }

    const score = Math.max(0, 100 - errors.length * 20 - warnings.length * 5);

    return {
      file: filePath,
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  async validateDirectory(directory: string): Promise<ValidationResult[]> {
    const files: ContextFile[] = ['AGENTS.md', 'CLAUDE.md', 'DESIGN.md'];
    const results = await Promise.all(
      files.map((f) => this.validateFile(path.join(directory, f))),
    );
    return results;
  }
}
