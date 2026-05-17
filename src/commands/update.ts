import type { Reporter } from '../ui/reporter.js';
import { InitCommand } from './init.js';

export interface UpdateOptions {
  readonly targetDir: string;
  readonly dryRun: boolean;
}

export class UpdateCommand {
  constructor(private readonly reporter: Reporter) {}

  async execute(options: UpdateOptions): Promise<void> {
    // Update es init con strategy='merge' siempre (nunca sobrescribe)
    await new InitCommand(this.reporter).execute({
      targetDir: options.targetDir,
      dryRun: options.dryRun,
      force: false,
      config: {
        update: { strategy: 'merge', backup: false },
        output: { agents: true, claude: true, design: true, directory: options.targetDir },
      },
    });
  }
}
