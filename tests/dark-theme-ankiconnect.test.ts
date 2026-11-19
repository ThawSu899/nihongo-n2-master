import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ankiSyncService } from '../src/services/anki-sync';

describe('Dark Theme Harmonization & AnkiConnect Opt-In Verification', () => {
  describe('Phase 7: Dark Theme Harmonization', () => {
    it('dark-theme-harmony.css exists and defines critical rules for Dokkai, Choukai, and Reference workbenches', () => {
      const cssPath = path.resolve(process.cwd(), 'src/presentation/styles/dark-theme-harmony.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const content = fs.readFileSync(cssPath, 'utf-8');
      expect(content).toContain('[data-reference-workbench="root"]');
      expect(content).toContain('[data-reference-workbench="header"]');
      expect(content).toContain('[data-reference-workbench="tabs"]');
      expect(content).toContain('[data-component="dokkai-workbench"]');
      expect(content).toContain('[data-component="choukai-workbench"]');
    });

    it('main.tsx imports dark-theme-harmony.css', () => {
      const mainPath = path.resolve(process.cwd(), 'src/main.tsx');
      const content = fs.readFileSync(mainPath, 'utf-8');
      expect(content).toContain("import './presentation/styles/dark-theme-harmony.css'");
    });

    it('N5ReferenceWorkbench contains data-reference-workbench markers and dark mode classes', () => {
      const refPath = path.resolve(process.cwd(), 'src/presentation/components/N5ReferenceWorkbench.tsx');
      const content = fs.readFileSync(refPath, 'utf-8');
      expect(content).toContain('data-reference-workbench="root"');
      expect(content).toContain('data-reference-workbench="header"');
      expect(content).toContain('data-reference-workbench="tabs"');
      expect(content).toContain('dark:bg-stone-900');
    });
  });

  describe('Phase 8: AnkiConnect Polling Opt-In', () => {
    it('defaults autoSyncEnabled to false to prevent unprompted localhost:8765 polling', () => {
      expect(ankiSyncService.config.autoSyncEnabled).toBe(false);
    });

    it('does not have active auto-sync timer when initialized with default config', () => {
      const status = ankiSyncService.getStatus();
      expect(status.autoSyncActive).toBe(false);
    });
  });
});
