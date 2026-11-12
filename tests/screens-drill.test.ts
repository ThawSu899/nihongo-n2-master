import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressScreen } from '../src/presentation/screens/ProgressScreen';
import { QuarantineDrillScreen } from '../src/presentation/screens/QuarantineDrillScreen';
import { ShadowingScreen } from '../src/presentation/screens/ShadowingScreen';
import { db } from '../src/data/db/dexie-db';
import n5l01Json from '../content/packs/n5/n5.l01.json';

describe('Drill & Dashboard Screens: Progress, Quarantine, and Shadowing', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.study_sessions.clear();
    await db.mastery_records.clear();
    await db.srs_cards.clear();
    await db.review_logs.clear();
  });

  describe('ProgressScreen', () => {
    it('mounts and renders summary statistics and backup controls', async () => {
      const onNavigate = vi.fn();
      const html = renderToString(
        React.createElement(ProgressScreen, {
          profile: { dailyTargetMinutes: 60 },
          onNavigate,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Progress &amp; Learning Analytics');
      expect(html).toContain('Total Study Time');
      expect(html).toContain('Mastered Lessons');
      expect(html).toContain('Active SRS Cards');
      expect(html).toContain('30-Day True Retention');
      expect(html).toContain('Skill Competency Summary');
      expect(html).toContain('Data Integrity &amp; Backup');
      expect(html).toContain('Export Local JSON Snapshot');
      expect(html).toContain('Restore from JSON File');
    });
  });

  describe('QuarantineDrillScreen', () => {
    it('mounts QuarantineDrillScreen in loading or loaded state without crashing', async () => {
      const onBack = vi.fn();
      const html = renderToString(
        React.createElement(QuarantineDrillScreen, {
          onBack,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('animate-spin');
    });
  });

  describe('ShadowingScreen', () => {
    it('renders empty fallback message when lesson pack is not provided', () => {
      const onBack = vi.fn();
      const html = renderToString(
        React.createElement(ShadowingScreen, {
          pack: null,
          onBack,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Loading lesson dialogue audio...');
      expect(html).toContain('Return to Dashboard');
    });

    it('renders authentic dialogue lines, speaker acoustic badges, and controls with authentic pack', () => {
      const onBack = vi.fn();
      const pack = n5l01Json as any;

      const html = renderToString(
        React.createElement(ShadowingScreen, {
          pack,
          onBack,
        })
      );

      expect(html).toBeDefined();
      expect(html).toContain('Shadowing Audio Workbench (発音練習)');
      expect(html).toContain('N5.L01');
      expect(html).toContain('Self Introduction');
    });
  });
});
