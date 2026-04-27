import * as p from '@clack/prompts';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Reporter } from '../ui/reporter.js';
import { scanFilesForDeploys } from '../core/ai/deploy-scanner.js';

const DEPLOY_FILE = 'DEPLOY.md';

const DEPLOY_TEMPLATE = `# DEPLOY.md — Deployment Reference

> Managed by agentctx. Never hardcode real credentials here — reference environment variables.
> Agents must read this before executing any deployment command.

## Environments

`;

interface DeployEnvironment {
  name: string;
  command: string;
  envVars: string[];
  notes?: string;
  lastDeployed?: string;
}

export class DeployCommand {
  constructor(private readonly reporter: Reporter) {}

  async add(projectRoot: string): Promise<void> {
    const deployPath = path.join(projectRoot, DEPLOY_FILE);

    p.intro('Document a deployment environment');

    const nameChoice = await p.select({
      message: 'Environment',
      options: [
        { value: 'production',  label: 'production' },
        { value: 'staging',     label: 'staging' },
        { value: 'development', label: 'development' },
        { value: 'custom',      label: 'custom (I will type it)' },
      ],
    });
    if (p.isCancel(nameChoice)) { p.cancel('Cancelled'); return; }

    let envName = nameChoice as string;
    if (envName === 'custom') {
      const customName = await p.text({ message: 'Environment name', validate: (v) => (!v.trim() ? 'Required' : undefined) });
      if (p.isCancel(customName)) { p.cancel('Cancelled'); return; }
      envName = customName as string;
    }

    const answers = await p.group(
      {
        command: () =>
          p.text({
            message: 'Deploy command (use $VAR_NAME for credentials, never paste real values)',
            placeholder: 'kubectl apply -f k8s/ --namespace=$K8S_NAMESPACE --token=$K8S_TOKEN',
            validate: (v) => {
              if (!v.trim()) return 'Required';
              if (this.detectHardcodedSecret(v)) {
                return 'Looks like a hardcoded credential. Use $ENV_VAR_NAME instead.';
              }
              return undefined;
            },
          }),

        envVarsRaw: () =>
          p.text({
            message: 'Required environment variables (comma-separated)',
            placeholder: 'K8S_NAMESPACE, K8S_TOKEN, AWS_REGION',
          }),

        notes: () =>
          p.text({
            message: 'Important notes? (optional)',
            placeholder: 'Run migrations after. Takes ~5 min.',
          }),
      },
      { onCancel: () => { p.cancel('Cancelled'); process.exit(0); } },
    );

    const envVarsRaw = answers['envVarsRaw'] as string | undefined;
    const envVars = (envVarsRaw ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    const notesRaw = answers['notes'] as string | undefined;

    const env: DeployEnvironment = {
      name: envName,
      command: answers['command'] as string,
      envVars,
      ...(notesRaw?.trim() ? { notes: notesRaw.trim() } : {}),
    };

    await this.appendEnvironment(deployPath, env);
    p.outro(`Deploy environment "${envName}" added to ${DEPLOY_FILE}`);
  }

  async scan(projectRoot: string): Promise<void> {
    const deployPath = path.join(projectRoot, DEPLOY_FILE);

    if (!process.env['ANTHROPIC_API_KEY']) {
      this.reporter.error('ANTHROPIC_API_KEY is not set. Export it to use AI scanning.');
      return;
    }

    const SCAN_TARGETS = [
      'Makefile', 'makefile',
      'package.json',
      // GitHub Actions & GitLab CI
      '.github/workflows',
      '.gitlab-ci.yml',
      // CircleCI
      '.circleci/config.yml', '.circleci/config.yaml',
      // Azure Pipelines
      'azure-pipelines.yml', 'azure-pipelines.yaml',
      // Jenkins
      'Jenkinsfile',
      // Travis CI
      '.travis.yml',
      // Bitbucket Pipelines
      'bitbucket-pipelines.yml',
      // Docker
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      'docker-compose.prod.yml', 'docker-compose.prod.yaml',
      // Shell scripts
      'scripts/deploy.sh', 'scripts/release.sh', 'deploy.sh',
      // Heroku / Railway / Render
      'Procfile',
    ];

    const files: Array<{ name: string; content: string }> = [];

    for (const target of SCAN_TARGETS) {
      const fullPath = path.join(projectRoot, target);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          // scan first-level yml/yaml files in the directory
          const entries = await fs.readdir(fullPath);
          for (const entry of entries) {
            if (/\.(ya?ml)$/.test(entry)) {
              const content = await fs.readFile(path.join(fullPath, entry), 'utf-8');
              files.push({ name: `${target}/${entry}`, content });
            }
          }
        } else {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ name: target, content });
        }
      } catch {
        // file doesn't exist — skip
      }
    }

    if (files.length === 0) {
      this.reporter.warn('No recognizable deploy files found in this project.');
      return;
    }

    p.intro(`Scanning ${files.length} file(s) for deploy commands...`);

    let detected;
    try {
      detected = await scanFilesForDeploys(files);
    } catch (e) {
      this.reporter.error(`AI scan failed: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    if (detected.length === 0) {
      this.reporter.info('No deploy commands detected.');
      return;
    }

    this.reporter.section(`Found ${detected.length} deploy command(s)`);

    for (const cmd of detected) {
      this.reporter.blank();
      this.reporter.success(`Environment: ${cmd.environment}`);
      this.reporter.info(`  Command: ${cmd.command}`);
      if (cmd.envVars.length > 0) {
        this.reporter.info(`  Env vars: ${cmd.envVars.join(', ')}`);
      }
      if (cmd.notes) {
        this.reporter.info(`  Notes: ${cmd.notes}`);
      }
    }

    const confirm = await p.confirm({
      message: `Save these ${detected.length} environment(s) to ${DEPLOY_FILE}?`,
      initialValue: true,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.outro('Scan complete. Nothing saved.');
      return;
    }

    for (const cmd of detected) {
      const env: DeployEnvironment = {
        name: cmd.environment,
        command: cmd.command,
        envVars: cmd.envVars,
        ...(cmd.notes ? { notes: cmd.notes } : {}),
      };
      await this.appendEnvironment(deployPath, env);
    }

    p.outro(`Saved ${detected.length} deploy environment(s) to ${DEPLOY_FILE}`);
  }

  async show(projectRoot: string): Promise<void> {
    const deployPath = path.join(projectRoot, DEPLOY_FILE);
    try {
      const content = await fs.readFile(deployPath, 'utf-8');
      this.reporter.section('DEPLOY.md');
      process.stdout.write(content + '\n');
    } catch {
      this.reporter.warn(`No ${DEPLOY_FILE} found. Run \`agentctx deploy add\` to create one.`);
    }
  }

  private async appendEnvironment(deployPath: string, env: DeployEnvironment): Promise<void> {
    let content: string;
    try {
      content = await fs.readFile(deployPath, 'utf-8');
    } catch {
      content = DEPLOY_TEMPLATE;
    }

    const section = this.renderEnvironment(env);

    if (content.includes(`### ${env.name}`)) {
      content = content.replace(
        new RegExp(`### ${env.name}[\\s\\S]*?(?=### |$)`),
        section + '\n',
      );
    } else {
      content = content.trimEnd() + '\n\n' + section + '\n';
    }

    await fs.writeFile(deployPath, content, 'utf-8');
  }

  private renderEnvironment(env: DeployEnvironment): string {
    let out = `### ${env.name}\n\n`;
    out += `\`\`\`bash\n${env.command}\n\`\`\`\n\n`;

    if (env.envVars.length > 0) {
      out += `**Required environment variables:**\n`;
      for (const v of env.envVars) {
        out += `- \`${v}\` — *(set in your shell or CI secrets)*\n`;
      }
      out += '\n';
    }

    if (env.notes) {
      out += `**Notes:** ${env.notes}\n`;
    }

    return out;
  }

  private detectHardcodedSecret(command: string): boolean {
    const patterns = [
      /--(?:token|password|secret|key|api-?key)\s*=\s*[^\s$][^\s]{6,}/i,
      /\b(sk-|pk-|AKIA)[A-Za-z0-9]{10,}/,
      /password[:\s]+[^\s$]{6,}/i,
    ];
    return patterns.some((p) => p.test(command));
  }
}
