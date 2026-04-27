import type { Reporter } from '../ui/reporter.js';
import { ContextValidator } from '../core/validator/index.js';

export interface ValidateOptions {
  readonly targetDir: string;
}

export class ValidateCommand {
  constructor(private readonly reporter: Reporter) {}

  async execute(options: ValidateOptions): Promise<void> {
    const { targetDir } = options;

    this.reporter.section('Validating context files...');

    const validator = new ContextValidator();
    const results = await validator.validateDirectory(targetDir);

    let allValid = true;

    for (const result of results) {
      const name = result.file.split('/').at(-1) ?? result.file;

      if (result.errors.length === 0 && result.warnings.length === 0) {
        this.reporter.success(`${name} — score: ${result.score}/100`);
        continue;
      }

      if (!result.isValid) {
        allValid = false;
        this.reporter.error(`${name} — score: ${result.score}/100`);
        for (const e of result.errors) {
          this.reporter.info(`  [error] ${e.message}${e.suggestion ? ` — ${e.suggestion}` : ''}`);
        }
      } else {
        this.reporter.warn(`${name} — score: ${result.score}/100`);
      }

      for (const w of result.warnings) {
        this.reporter.info(`  [warn] ${w.message}`);
      }
    }

    this.reporter.blank();
    if (allValid) {
      this.reporter.success('All context files are valid.');
    } else {
      this.reporter.error('Some context files have errors. Fix them and run again.');
      process.exitCode = 1;
    }
  }
}
