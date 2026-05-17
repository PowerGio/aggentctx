import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { UpdateCommand } from '../../../src/commands/update.js';
import { SilentReporter } from '../../../src/ui/reporter.js';

let tmpDir: string;
let reporter: SilentReporter;
let cmd: UpdateCommand;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-update-'));
  reporter = new SilentReporter();
  cmd = new UpdateCommand(reporter);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// Helper: escribe un package.json mínimo para que el detector reconozca el proyecto
async function writePackageJson(dir: string, extra: Record<string, unknown> = {}): Promise<void> {
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'test-project', ...extra }),
    'utf-8',
  );
}

describe('UpdateCommand', () => {
  describe('directorio sin CLAUDE.md', () => {
    it('escribe CLAUDE.md nuevo cuando no existe', async () => {
      await writePackageJson(tmpDir);

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const claudePath = path.join(tmpDir, 'CLAUDE.md');
      const exists = await fs.access(claudePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('el CLAUDE.md generado contiene secciones agentctx', async () => {
      await writePackageJson(tmpDir);

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // Debe contener al menos una sección agentctx
      expect(content).toMatch(/agentctx/);
    });

    it('reporta el archivo como escrito (success)', async () => {
      await writePackageJson(tmpDir);

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('CLAUDE.md'),
      );
      expect(successMsg).toBeDefined();
    });
  });

  describe('CLAUDE.md existente sin secciones agentctx', () => {
    it('agrega secciones agentctx al archivo existente', async () => {
      await writePackageJson(tmpDir);
      const originalContent = '# CLAUDE.md — Mi Proyecto\n\n## Configuración\n\nUsar siempre TypeScript estricto.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), originalContent, 'utf-8');

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');

      // El contenido original debe preservarse
      expect(content).toContain('Mi Proyecto');
      expect(content).toContain('Usar siempre TypeScript estricto.');

      // Las secciones agentctx deben haberse agregado
      expect(content).toMatch(/agentctx/);
    });

    it('preserva TODO el contenido original del usuario', async () => {
      await writePackageJson(tmpDir);
      const userConfig = [
        '# CLAUDE.md — Atlas',
        '',
        '## NXT AI Development Framework',
        '',
        'Slash commands: /nxt/dev, /nxt/qa',
        'Agentes: 47 agentes especializados',
        '',
        '## Reglas',
        '',
        '- Siempre usar agentes NXT',
        '- Nunca hardcodear secrets',
      ].join('\n');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), userConfig, 'utf-8');

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('NXT AI Development Framework');
      expect(content).toContain('Slash commands: /nxt/dev');
      expect(content).toContain('Nunca hardcodear secrets');
    });
  });

  describe('CLAUDE.md existente con secciones idénticas', () => {
    it('reporta up_to_date cuando las secciones agentctx ya existen y son idénticas', async () => {
      await writePackageJson(tmpDir);

      // Primero ejecutamos update para generar el archivo con secciones
      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      // Limpiamos el reporter para la segunda pasada
      reporter.messages.length = 0;

      // Segunda ejecución: las secciones ya existen → up_to_date
      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const upToDateMsg = reporter.messages.find(
        (m) => m.startsWith('info:') && m.includes('up to date'),
      );
      expect(upToDateMsg).toBeDefined();
    });

    it('no sobreescribe el contenido del usuario en una segunda pasada', async () => {
      await writePackageJson(tmpDir);
      const userNotes = 'NOTA IMPORTANTE: no borrar esta línea';
      const baseContent = `# CLAUDE.md\n\n## Proyecto\n\n${userNotes}\n`;
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), baseContent, 'utf-8');

      // Primera pasada: agrega secciones agentctx
      await cmd.execute({ targetDir: tmpDir, dryRun: false });
      let content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain(userNotes);

      // Segunda pasada: no debe borrar nada
      await cmd.execute({ targetDir: tmpDir, dryRun: false });
      content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain(userNotes);
    });
  });

  describe('modo dry-run', () => {
    it('en dry-run no crea CLAUDE.md si no existe', async () => {
      await writePackageJson(tmpDir);

      await cmd.execute({ targetDir: tmpDir, dryRun: true });

      const claudePath = path.join(tmpDir, 'CLAUDE.md');
      const exists = await fs.access(claudePath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('en dry-run reporta los archivos que se escribirían', async () => {
      await writePackageJson(tmpDir);

      await cmd.execute({ targetDir: tmpDir, dryRun: true });

      const dryRunMsgs = reporter.messages.filter((m) => m.startsWith('dry-run:'));
      expect(dryRunMsgs.length).toBeGreaterThan(0);
    });
  });

  describe('estrategia de update siempre es merge (nunca overwrite)', () => {
    it('update no borra el contenido existente aunque use force internamente', async () => {
      await writePackageJson(tmpDir);
      const importantContent = 'LINEA CRITICA QUE NUNCA DEBE BORRARSE';
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        `# CLAUDE.md\n\n${importantContent}\n`,
        'utf-8',
      );

      await cmd.execute({ targetDir: tmpDir, dryRun: false });

      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      // La estrategia merge siempre preserva el contenido existente
      expect(content).toContain(importantContent);
    });
  });
});
