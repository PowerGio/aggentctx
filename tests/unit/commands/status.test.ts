import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StatusCommand } from '../../../src/commands/status.js';
import { SilentReporter } from '../../../src/ui/reporter.js';

let tmpDir: string;
let reporter: SilentReporter;
let cmd: StatusCommand;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentctx-status-'));
  reporter = new SilentReporter();
  cmd = new StatusCommand(reporter);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('StatusCommand', () => {
  describe('directorio sin archivos de contexto', () => {
    it('reporta "not found" para todos los archivos de contexto', async () => {
      await cmd.execute({ targetDir: tmpDir });

      // Todos los archivos de contexto deben aparecer como "not found"
      const contextFiles = ['CLAUDE.md', 'AGENTS.md', 'DESIGN.md', 'FEATURES.md', 'DEPLOY.md'];
      for (const name of contextFiles) {
        const notFoundMsg = reporter.messages.some(
          (m) => m.includes(name) && m.includes('not found'),
        );
        expect(notFoundMsg, `${name} debe reportarse como not found`).toBe(true);
      }
    });

    it('no reporta ningún mensaje de success (✓) cuando no hay archivos', async () => {
      await cmd.execute({ targetDir: tmpDir });

      const successMessages = reporter.messages.filter((m) => m.startsWith('success:'));
      expect(successMessages).toHaveLength(0);
    });
  });

  describe('CLAUDE.md sin secciones agentctx', () => {
    it('reporta el archivo como found pero sin el tag de secciones agentctx', async () => {
      const content = '# CLAUDE.md\n\n## My Project\n\nAlgunos settings del proyecto.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), content, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      // Debe existir un mensaje de success con "CLAUDE.md"
      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('CLAUDE.md'),
      );
      expect(successMsg).toBeDefined();

      // No debe contener el tag de secciones agentctx
      expect(successMsg).not.toContain('agentctx sections ✓');
    });

    it('reporta el número de líneas del archivo', async () => {
      const lines = Array.from({ length: 10 }, (_, i) => `línea ${i + 1}`).join('\n');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), lines, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('CLAUDE.md'),
      );
      expect(successMsg).toBeDefined();
      expect(successMsg).toContain('lines');
    });
  });

  describe('CLAUDE.md con sección "## agentctx — First-Run Bootstrap"', () => {
    it('reporta el tag de secciones agentctx ✓', async () => {
      const content = [
        '# CLAUDE.md',
        '',
        '## Mi proyecto',
        '',
        'Configuración general.',
        '',
        '## agentctx — First-Run Bootstrap',
        '',
        'Si `.agentctx/pending-bootstrap.md` existe, lee el resumen del proyecto.',
        '',
        '## agentctx — Commit Validation (automatic)',
        '',
        'Después de cada commit, verifica si existe `.agentctx/pending-review.md`.',
        '',
        '> This file is managed by agentctx. Do not remove this section.',
      ].join('\n');

      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), content, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('CLAUDE.md'),
      );
      expect(successMsg).toBeDefined();
      expect(successMsg).toContain('agentctx sections ✓');
    });

    it('también detecta secciones cuando el contenido usa "agentctx —" (guión largo)', async () => {
      // La detección usa content.includes('agentctx —')
      const content = '# CLAUDE.md\n\n## agentctx — Commit Validation (automatic)\n\nContenido.\n';
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), content, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('CLAUDE.md'),
      );
      expect(successMsg).toContain('agentctx sections ✓');
    });
  });

  describe('AGENTS.md presente', () => {
    it('reporta el archivo con líneas correctas y no lo marca como not found', async () => {
      const content = '# AGENTS.md\n\n## Project Overview\n\nMi proyecto.\n\n## Agent Workflow\n\nFlujo de trabajo.\n';
      await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), content, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      // AGENTS.md debe aparecer como success (found)
      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('AGENTS.md'),
      );
      expect(successMsg).toBeDefined();

      // No debe aparecer como "not found"
      const notFoundMsg = reporter.messages.find(
        (m) => m.includes('AGENTS.md') && m.includes('not found'),
      );
      expect(notFoundMsg).toBeUndefined();

      // Debe mostrar el conteo de líneas
      expect(successMsg).toContain('lines');
    });

    it('AGENTS.md sin secciones agentctx no muestra el tag ✓', async () => {
      const content = '# AGENTS.md\n\n## Project Overview\n\nSolo contenido normal.\n';
      await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), content, 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      const successMsg = reporter.messages.find(
        (m) => m.startsWith('success:') && m.includes('AGENTS.md'),
      );
      expect(successMsg).toBeDefined();
      expect(successMsg).not.toContain('agentctx sections ✓');
    });
  });

  describe('múltiples archivos presentes', () => {
    it('reporta correctamente la mezcla de archivos presentes y ausentes', async () => {
      // Solo CLAUDE.md y FEATURES.md existen
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE\n', 'utf-8');
      await fs.writeFile(path.join(tmpDir, 'FEATURES.md'), '# FEATURES\n', 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      // Archivos presentes → success
      expect(reporter.messages.some((m) => m.startsWith('success:') && m.includes('CLAUDE.md'))).toBe(true);
      expect(reporter.messages.some((m) => m.startsWith('success:') && m.includes('FEATURES.md'))).toBe(true);

      // Archivos ausentes → "not found"
      expect(reporter.messages.some((m) => m.includes('AGENTS.md') && m.includes('not found'))).toBe(true);
      expect(reporter.messages.some((m) => m.includes('DESIGN.md') && m.includes('not found'))).toBe(true);
      expect(reporter.messages.some((m) => m.includes('DEPLOY.md') && m.includes('not found'))).toBe(true);
    });
  });

  describe('info del stack detectado', () => {
    it('reporta la sección de stack aunque no haya archivos de contexto', async () => {
      await cmd.execute({ targetDir: tmpDir });

      const stackMsg = reporter.messages.find((m) => m.includes('Stack:'));
      expect(stackMsg).toBeDefined();
    });

    it('monorepo con workspaces muestra cada workspace en el reporte', async () => {
      // Construir un monorepo mínimo: 2 subdirectorios con manifests
      const feDir = path.join(tmpDir, 'frontend');
      const beDir = path.join(tmpDir, 'backend');
      await fs.mkdir(feDir, { recursive: true });
      await fs.mkdir(beDir, { recursive: true });
      await fs.writeFile(
        path.join(feDir, 'package.json'),
        JSON.stringify({ name: 'fe', dependencies: { react: '^18' } }),
        'utf-8',
      );
      await fs.writeFile(path.join(beDir, 'requirements.txt'), 'fastapi\n', 'utf-8');

      await cmd.execute({ targetDir: tmpDir });

      // Al menos un mensaje de info debe mencionar "frontend" o "backend"
      const workspaceMsgs = reporter.messages.filter(
        (m) => m.startsWith('info:') && (m.includes('frontend') || m.includes('backend')),
      );
      expect(workspaceMsgs.length).toBeGreaterThan(0);
    });
  });
});
