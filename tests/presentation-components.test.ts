import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The 12 presentation components under test
import { CommandPaletteModal } from '../src/presentation/components/CommandPaletteModal';
import { FuriganaRuby } from '../src/presentation/components/FuriganaRuby';
import { GhostQuarantineHub } from '../src/presentation/components/GhostQuarantineHub';
import { Header } from '../src/presentation/components/Header';
import {
  InteractiveKanjiText,
  InteractiveKanjiSpan,
  renderTextWithKanji,
} from '../src/presentation/components/InteractiveKanjiText';
import {
  KanjiSlideOverDrawer,
  KanjiDrawer,
} from '../src/presentation/components/KanjiSlideOverDrawer';
import { Navigation } from '../src/presentation/components/Navigation';
import { NuanceWarningBanner } from '../src/presentation/components/NuanceWarningBanner';
import { PWAInstallBanner } from '../src/presentation/components/PWAInstallBanner';
import { PWAUpdateBanner } from '../src/presentation/components/PWAUpdateBanner';
import { ReminderBanner } from '../src/presentation/components/ReminderBanner';
import { SkillRadarChart, SkillScoreData } from '../src/presentation/components/SkillRadarChart';
import { TimerWidget } from '../src/presentation/components/TimerWidget';
import { StudyTimerState, UserProfile } from '../src/domain/models/types';

describe('Presentation Components (12 Untested Components)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. CommandPaletteModal
  describe('1. CommandPaletteModal', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        React.createElement(CommandPaletteModal, {
          isOpen: false,
          onClose: vi.fn(),
        })
      );
      expect(html).toBe('');
    });

    it('renders input and search modal container when isOpen is true', () => {
      const html = renderToString(
        React.createElement(CommandPaletteModal, {
          isOpen: true,
          onClose: vi.fn(),
          onInspectKanji: vi.fn(),
          onOpenReference: vi.fn(),
        })
      );
      expect(html).toContain('JLPT N2 Command Palette');
      expect(html).toContain('ESC');
    });
  });

  // 2. FuriganaRuby
  describe('2. FuriganaRuby', () => {
    it('renders <ruby> and <rt> tags in default "always" mode', () => {
      const html = renderToString(
        React.createElement(FuriganaRuby, {
          kanji: '漢字',
          kana: 'かんじ',
        })
      );
      expect(html).toContain('<ruby');
      expect(html).toContain('漢字');
      expect(html).toContain('<rt');
      expect(html).toContain('かんじ');
    });

    it('suppresses <rt> when mode is "never" or when kanji === kana', () => {
      const htmlNever = renderToString(
        React.createElement(FuriganaRuby, {
          kanji: '漢字',
          kana: 'かんじ',
          furiganaMode: 'never',
        })
      );
      expect(htmlNever).not.toContain('<rt');
      expect(htmlNever).toContain('漢字');

      const htmlKanaMatch = renderToString(
        React.createElement(FuriganaRuby, {
          kanji: 'ここ',
          kana: 'ここ',
        })
      );
      expect(htmlKanaMatch).not.toContain('<rt');
      expect(htmlKanaMatch).toContain('ここ');
    });

    it('displays romaji transliteration when showRomaji is true', () => {
      const html = renderToString(
        React.createElement(FuriganaRuby, {
          kanji: '日本',
          kana: 'にほん',
          showRomaji: true,
        })
      );
      expect(html).toContain('nihon');
    });
  });

  // 3. GhostQuarantineHub
  describe('3. GhostQuarantineHub', () => {
    it('mounts GhostQuarantineHub cleanly', () => {
      const html = renderToString(
        React.createElement(GhostQuarantineHub, {
          onStartGhostReview: vi.fn(),
          onRefreshParentQueue: vi.fn(),
        })
      );
      expect(html).toBeDefined();
      expect(html).toContain('Loading Ghost Quarantine...');
    });
  });

  // 4. Header
  describe('4. Header', () => {
    const mockProfile: UserProfile = {
      name: 'Learner',
      level: 'N2',
      currentLessonId: 'n2.l01',
      dailyTargetMinutes: 100,
      dayRolloverHour: 4,
      showRomaji: false,
      furiganaMode: 'always',
      explanationLang: 'en',
      targetRetention: 0.9,
      dailyNewCap: 30,
      dailyReviewCap: 200,
      streakDays: 7,
      notificationSettings: { inApp: true, email: false },
    } as any;

    it('calculates goal progress percent accurately and renders action triggers', () => {
      const onNavigate = vi.fn();
      const onOpenDiagnostics = vi.fn();
      const onOpenSearch = vi.fn();

      const html = renderToString(
        React.createElement(Header, {
          profile: mockProfile,
          todayMinutes: 50, // 50 / 100 = 50%
          onNavigate,
          onOpenDiagnostics,
          onOpenSearch,
        })
      );

      expect(html).toContain('50%');
      expect(html).toContain('50<!-- -->m');
      expect(html).toContain('100<!-- -->m');
      expect(html).toContain('7'); // streak
    });
  });

  // 5. InteractiveKanjiText
  describe('5. InteractiveKanjiText', () => {
    it('renders text with interactive kanji spans for kanji characters and plain text for kana', () => {
      const onInspect = vi.fn();
      const html = renderToString(
        React.createElement(InteractiveKanjiText, {
          text: '私は学生です',
          onInspectKanji: onInspect,
        })
      );

      expect(html).toContain('私');
      expect(html).toContain('学');
      expect(html).toContain('生');
      expect(html).toContain('は');
      expect(html).toContain('で');
      expect(html).toContain('す');
    });

    it('InteractiveKanjiSpan renders kanji char with hover and title attributes', () => {
      const onInspect = vi.fn();
      const html = renderToString(
        React.createElement(InteractiveKanjiSpan, {
          char: '猫',
          sentenceText: '猫が好きです。',
          onInspect,
        })
      );
      expect(html).toContain('猫');
      expect(html).toContain('漢字: 猫');
    });

    it('renderTextWithKanji extracts and identifies kanji correctly', () => {
      const onInspect = vi.fn();
      const nodes = renderTextWithKanji('日本語', '日本語を勉強します', onInspect);
      expect(Array.isArray(nodes)).toBe(true);
      expect((nodes as any[]).length).toBe(3);
    });
  });

  // 6. KanjiSlideOverDrawer
  describe('6. KanjiSlideOverDrawer', () => {
    it('re-exports KanjiDrawer correctly with identical identity', () => {
      expect(KanjiSlideOverDrawer).toBeDefined();
      expect(KanjiSlideOverDrawer).toBe(KanjiDrawer);
    });
  });

  // 7. Navigation
  describe('7. Navigation', () => {
    it('renders all core navigation links and due SRS badge count', () => {
      const onNavigate = vi.fn();
      const html = renderToString(
        React.createElement(Navigation, {
          currentView: 'home',
          onNavigate,
          dueSrsCount: 12,
          todayMinutes: 45,
          goalMinutes: 60,
        })
      );

      expect(html).toContain('Dashboard');
      expect(html).toContain('Curriculum');
      expect(html).toContain('SRS');
      expect(html).toContain('Tests');
      expect(html).toContain('12'); // due badge
    });
  });

  // 8. NuanceWarningBanner
  describe('8. NuanceWarningBanner', () => {
    it('renders synonym distinction warning and retry button', () => {
      const onRetry = vi.fn();
      const html = renderToString(
        React.createElement(NuanceWarningBanner, {
          enteredSynonym: '〜とき',
          expectedTarget: '〜際（に）',
          nuanceMessage: '際 is formal while とき is general.',
          nuanceMessageMy: '際 သည် ပိုမိုယဉ်ကျေးသော အသုံးဖြစ်ပါသည်။',
          onRetry,
        })
      );

      expect(html).toContain('သဒ္ဒါအသုံးအနှုန်း ခွဲခြားခြင်း');
      expect(html).toContain('〜とき');
      expect(html).toContain('際 is formal while とき is general.');
      expect(html).toContain('ပြန်လည်ကြိုးစားရန်');
    });
  });

  // 9. PWAInstallBanner
  describe('9. PWAInstallBanner', () => {
    it('renders PWAInstallBanner without crashing', () => {
      const html = renderToString(React.createElement(PWAInstallBanner));
      expect(html).toBeDefined();
    });
  });

  // 9b. PWAUpdateBanner
  describe('9b. PWAUpdateBanner', () => {
    it('renders PWAUpdateBanner safely without crashing', () => {
      const html = renderToString(React.createElement(PWAUpdateBanner));
      expect(html).toBeDefined();
    });
  });

  // 10. ReminderBanner
  describe('10. ReminderBanner', () => {
    it('renders schedule alarm banner and .ics export trigger', () => {
      const html = renderToString(
        React.createElement(ReminderBanner, {
          blocks: [
            {
              id: 'b_vocab',
              type: 'vocab',
              title: 'Vocab Review',
              durationMinutes: 30,
              scheduledTime: '08:00',
            } as any,
          ],
          dateIso: '2026-11-12',
        })
      );

      expect(html).toContain('Study Reminders &amp; Schedule Alarms');
      expect(html).toContain('.ics calendar file');
      expect(html).toContain('Export .ics Schedule');
    });
  });

  // 11. SkillRadarChart
  describe('11. SkillRadarChart', () => {
    const mockSkills: SkillScoreData[] = [
      { skill: 'vocab', label: 'Vocabulary', scorePct: 90, thresholdPct: 90, testedCount: 20, correctCount: 18 },
      { skill: 'kanji', label: 'Kanji', scorePct: 85, thresholdPct: 85, testedCount: 15, correctCount: 13 },
      { skill: 'grammar', label: 'Grammar', scorePct: 85, thresholdPct: 85, testedCount: 20, correctCount: 17 },
      { skill: 'reading', label: 'Reading', scorePct: 80, thresholdPct: 80, testedCount: 10, correctCount: 8 },
      { skill: 'listening', label: 'Listening', scorePct: 80, thresholdPct: 80, testedCount: 10, correctCount: 8 },
    ];

    it('renders SVG pentagon with calculated polygon points and labels', () => {
      const html = renderToString(
        React.createElement(SkillRadarChart, {
          skills: mockSkills,
          size: 260,
        })
      );

      expect(html).toContain('<svg');
      expect(html).toContain('<polygon');
      expect(html).toContain('Vocabulary');
      expect(html).toContain('Kanji');
      expect(html).toContain('Grammar');
      expect(html).toContain('Reading');
      expect(html).toContain('Listening');
    });
  });

  // 12. TimerWidget
  describe('12. TimerWidget', () => {
    it('returns null when timer state is idle', () => {
      const idleState: StudyTimerState = {
        state: 'idle',
        blockId: null,
        targetMinutes: 60,
        startedAt: null,
        accumulatedMs: 0,
        lastInteractionAt: Date.now(),
      };

      const html = renderToString(
        React.createElement(TimerWidget, {
          timerState: idleState,
          elapsedSec: 0,
          remainingSec: 3600,
          isIdlePaused: false,
          onPause: vi.fn(),
          onResume: vi.fn(),
          onFinish: vi.fn(),
          onSkip: vi.fn(),
          todayStudiedMinutes: 0,
        })
      );

      expect(html).toBe('');
    });

    it('renders active timer island with circular progress ring when running', () => {
      const runningState: StudyTimerState = {
        state: 'running',
        blockId: 'block_kanji_cram',
        targetMinutes: 45,
        startedAt: Date.now() - 900000,
        accumulatedMs: 900000,
        lastInteractionAt: Date.now(),
      };

      const html = renderToString(
        React.createElement(TimerWidget, {
          timerState: runningState,
          elapsedSec: 900,
          remainingSec: 1800,
          isIdlePaused: false,
          onPause: vi.fn(),
          onResume: vi.fn(),
          onFinish: vi.fn(),
          onSkip: vi.fn(),
          todayStudiedMinutes: 15,
        })
      );

      expect(html).toContain('Active Study Timer');
      expect(html).toContain('KANJI CRAM');
      expect(html).toContain('30:00'); // 1800s remaining
      expect(html).toContain('title="Pause Timer"');
    });
  });
});
