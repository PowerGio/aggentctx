import type { AppError } from '../utils/result.js';
import { formatError } from '../utils/result.js';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

export interface Reporter {
  success(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(error: AppError | string): void;
  section(title: string): void;
  dryRun(message: string): void;
  blank(): void;
}

export class ConsoleReporter implements Reporter {
  private readonly noColor: boolean;

  constructor() {
    this.noColor = !process.stdout.isTTY || process.env['NO_COLOR'] !== undefined;
  }

  success(message: string): void {
    this.print(`${c.green}✓${c.reset} ${message}`);
  }

  info(message: string): void {
    this.print(`  ${message}`);
  }

  warn(message: string): void {
    this.print(`${c.yellow}⚠${c.reset}  ${message}`);
  }

  error(error: AppError | string): void {
    const message = typeof error === 'string' ? error : formatError(error);
    this.print(`${c.red}✗${c.reset} ${message}`);
  }

  section(title: string): void {
    this.print(`\n${c.bold}${c.cyan}${title}${c.reset}`);
  }

  dryRun(message: string): void {
    this.print(`${c.dim}[dry-run]${c.reset} ${message}`);
  }

  blank(): void {
    process.stdout.write('\n');
  }

  private print(message: string): void {
    const output = this.noColor ? message.replace(/\x1b\[[0-9;]*m/g, '') : message;
    process.stdout.write(output + '\n');
  }
}

export class SilentReporter implements Reporter {
  readonly messages: string[] = [];

  success(message: string): void  { this.messages.push(`success: ${message}`); }
  info(message: string): void     { this.messages.push(`info: ${message}`); }
  warn(message: string): void     { this.messages.push(`warn: ${message}`); }
  error(error: AppError | string): void {
    const msg = typeof error === 'string' ? error : formatError(error);
    this.messages.push(`error: ${msg}`);
  }
  section(title: string): void   { this.messages.push(`section: ${title}`); }
  dryRun(message: string): void  { this.messages.push(`dry-run: ${message}`); }
  blank(): void                  {}
}
