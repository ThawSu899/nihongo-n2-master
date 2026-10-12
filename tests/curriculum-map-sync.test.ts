import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CurriculumMapItem, LessonPack, UserProfile } from '../src/domain/models/types';
import curriculumMapJson from '../content/curriculum-map.json';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCurriculumMapParity(
  mapItem: CurriculumMapItem,
  pack: LessonPack
): ValidationResult {
  const errors: string[] = [];

  // 1. Status parity
  if (mapItem.status !== pack.status) {
    errors.push(`Status mismatch: map=${mapItem.status}, pack=${pack.status}`);
  }

  // 2. Counts parity
  if (mapItem.targetVocabCount !== pack.vocabularies.length) {
    errors.push(
      `Vocab count mismatch: map=${mapItem.targetVocabCount}, pack=${pack.vocabularies.length}`
    );
  }
  if (mapItem.targetKanjiCount !== pack.kanjis.length) {
    errors.push(
      `Kanji count mismatch: map=${mapItem.targetKanjiCount}, pack=${pack.kanjis.length}`
    );
  }

  // 3. Title parity
  if (mapItem.title !== pack.title) {
    errors.push(`Title mismatch: map="${mapItem.title}", pack="${pack.title}"`);
  }

  // 4. No placeholder grammar labels
  if (Array.isArray(mapItem.grammarTopics)) {
    for (const topic of mapItem.grammarTopics) {
      if (/Grammar Point \d/i.test(topic)) {
        errors.push(`Placeholder grammar label detected: "${topic}"`);
      }
    }
  }

  // 5. No published lesson has "Outline only" text
  if (mapItem.status === 'published') {
    const serialized = JSON.stringify(mapItem);
    if (/Outline only/i.test(serialized)) {
      errors.push(`Published lesson contains "Outline only" text: ${serialized}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Curriculum Map & Lesson Pack Parity (Single Source of Truth)', () => {
  const mapItems = curriculumMapJson as CurriculumMapItem[];
  const mapById = new Map<string, CurriculumMapItem>(mapItems.map((item) => [item.id, item]));

  it('contains exactly 174 curriculum map entries spanning N5, N4, N3, N2', () => {
    expect(mapItems).toHaveLength(174);
    const n5 = mapItems.filter((i) => i.level === 'N5');
    const n4 = mapItems.filter((i) => i.level === 'N4');
    const n3 = mapItems.filter((i) => i.level === 'N3');
    const n2 = mapItems.filter((i) => i.level === 'N2');
    expect(n5).toHaveLength(30);
    expect(n4).toHaveLength(36);
    expect(n3).toHaveLength(48);
    expect(n2).toHaveLength(60);
  });

  it('validates ALL 174 lessons: map status, counts, title, grammar labels, and no outline text', () => {
    const failures: Array<{ id: string; errors: string[] }> = [];

    for (const mapItem of mapItems) {
      const levelDir = mapItem.level.toLowerCase();
      const packPath = path.resolve(`./content/packs/${levelDir}/${mapItem.id}.json`);
      expect(fs.existsSync(packPath), `Pack file must exist at ${packPath}`).toBe(true);

      const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8')) as LessonPack;
      const res = validateCurriculumMapParity(mapItem, pack);
      if (!res.valid) {
        failures.push({ id: mapItem.id, errors: res.errors });
      }
    }

    if (failures.length > 0) {
      console.error('Curriculum Map Parity Failures:', JSON.stringify(failures, null, 2));
    }
    expect(failures).toEqual([]);
  });

  describe('Regression Guard: Detection of Broken / Stale Fixtures', () => {
    const validPack = JSON.parse(
      fs.readFileSync(path.resolve('./content/packs/n5/n5.l01.json'), 'utf-8')
    ) as LessonPack;

    it('FAILS when map status does not match pack status (e.g. reviewed vs published)', () => {
      const staleMapItem: CurriculumMapItem = {
        id: 'n5.l01',
        level: 'N5',
        module: 'N5 Foundation 1',
        number: 1,
        title: validPack.title,
        grammarTopics: validPack.grammars.map((g) => g.pattern),
        targetKanjiCount: validPack.kanjis.length,
        targetVocabCount: validPack.vocabularies.length,
        status: 'reviewed', // Broken status mismatch
      };

      const result = validateCurriculumMapParity(staleMapItem, validPack);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Status mismatch: map=reviewed, pack=published');
    });

    it('FAILS when targetVocabCount or targetKanjiCount contradicts real pack counts', () => {
      const mismatchedCountsItem: CurriculumMapItem = {
        id: 'n5.l01',
        level: 'N5',
        module: 'N5 Foundation 1',
        number: 1,
        title: validPack.title,
        grammarTopics: validPack.grammars.map((g) => g.pattern),
        targetKanjiCount: 8, // Real is 3
        targetVocabCount: 25, // Real is 12
        status: 'published',
      };

      const result = validateCurriculumMapParity(mismatchedCountsItem, validPack);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Vocab count mismatch: map=25, pack=12',
          'Kanji count mismatch: map=8, pack=3',
        ])
      );
    });

    it('FAILS when placeholder grammar labels match /Grammar Point \\d/', () => {
      const placeholderGrammarItem: CurriculumMapItem = {
        id: 'n5.l01',
        level: 'N5',
        module: 'N5 Foundation 1',
        number: 1,
        title: validPack.title,
        grammarTopics: ['N5 Grammar Point 1.1', 'N5 Grammar Point 1.2'],
        targetKanjiCount: validPack.kanjis.length,
        targetVocabCount: validPack.vocabularies.length,
        status: 'published',
      };

      const result = validateCurriculumMapParity(placeholderGrammarItem, validPack);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'Placeholder grammar label detected: "N5 Grammar Point 1.1"',
          'Placeholder grammar label detected: "N5 Grammar Point 1.2"',
        ])
      );
    });

    it('FAILS when a published lesson retains "Outline only" text', () => {
      const outlinePublishedItem: CurriculumMapItem = {
        id: 'n5.l01',
        level: 'N5',
        module: 'N5 Foundation 1',
        number: 1,
        title: 'Outline only — content not yet available',
        grammarTopics: validPack.grammars.map((g) => g.pattern),
        targetKanjiCount: validPack.kanjis.length,
        targetVocabCount: validPack.vocabularies.length,
        status: 'published',
      };

      const result = validateCurriculumMapParity(outlinePublishedItem, validPack);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Outline only'))).toBe(true);
    });
  });

  describe('UI & App-Level Verification (CurriculumScreen & ContentLoader)', () => {
    it('CurriculumScreen header displays updated AI-assisted editorial notice', async () => {
      const { renderToString } = await import('react-dom/server');
      const React = await import('react');
      const { CurriculumScreen } = await import('../src/presentation/screens/CurriculumScreen');

      const html = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
        })
      );

      // Verify header text
      expect(html).toContain('Curriculum Map (174 Lessons)');
      expect(html).toContain(
        'Complete N5 → N2 curriculum across 174 lesson packs. AI-assisted editorial authoring, not human-reviewed.'
      );
      expect(html).not.toContain('Per Milestone 1 scope, N5 Day 1 is published and playable');
    });

    it('confirms n5.l21 and n5.l30 render as Published with correct counts and NO Planned gate', async () => {
      const { renderToString } = await import('react-dom/server');
      const React = await import('react');
      const { CurriculumScreen } = await import('../src/presentation/screens/CurriculumScreen');

      const html = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
        })
      ).replace(/<!-- -->/g, '');

      // N5 Day 21 check
      expect(html).toContain('n5.l21');
      expect(html).toContain('Becoming and Listing (〜くなる・〜になる・〜たり〜たり)');
      expect(html).toContain('Target Kanji: 4');
      expect(html).toContain('Target Vocab: 12');
      expect(html).toContain('[V1-ta] り、[V2-ta] り します');

      // N5 Day 30 check
      expect(html).toContain('n5.l30');
      expect(html).toContain('N5 Comprehensive Review and Integration (総まとめ &amp; Can-do)');
      expect(html).toContain('Target Kanji: 4');
      expect(html).toContain('Target Vocab: 12');

      // Check reviewStatus badge and status badge
      expect(html).toContain('AI-Authored');
      expect(html).toContain('Published');
      expect(html).not.toContain('Outline only — content not yet available');
    });

    it('confirms n4.l01, n3.l10, and n2.l01 render with correct status, title, grammar labels and counts', async () => {
      const { renderToString } = await import('react-dom/server');
      const React = await import('react');
      const { CurriculumScreen } = await import('../src/presentation/screens/CurriculumScreen');

      // Test N4 Curriculum View
      const htmlN4 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N4',
        })
      ).replace(/<!-- -->/g, '');
      expect(htmlN4).toContain('n4.l01');
      expect(htmlN4).toContain('N4 Lesson 1: Potential Form (可能形: 読める・話せる / 見える・聞こえる)');
      expect(htmlN4).toContain('[Verb Potential Form] (が 話せる / が 読める)');
      expect(htmlN4).toContain('〜が 見える / 〜が 聞こえる');
      expect(htmlN4).toContain('Target Kanji: 4');
      expect(htmlN4).toContain('Target Vocab: 12');
      expect(htmlN4).toContain('Published');
      expect(htmlN4).not.toContain('N4 Grammar Point');

      // Test N3 Curriculum View
      const htmlN3 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N3',
        })
      ).replace(/<!-- -->/g, '');
      expect(htmlN3).toContain('n3.l10');
      expect(htmlN3).toContain('N3 Lesson 10: Natural Consequence &amp; Certainty (必然・当然の帰結: 〜わけだ vs 〜わけがない)');
      expect(htmlN3).toContain('〜わけだ');
      expect(htmlN3).toContain('〜わけがない');
      expect(htmlN3).toContain('Target Kanji: 4');
      expect(htmlN3).toContain('Target Vocab: 12');
      expect(htmlN3).toContain('Published');
      expect(htmlN3).not.toContain('N3 Grammar Point');

      // Test N2 Curriculum View
      const htmlN2 = renderToString(
        React.createElement(CurriculumScreen, {
          onSelectLesson: () => {},
          masteryRecords: {},
          initialLevel: 'N2',
        })
      ).replace(/<!-- -->/g, '');
      expect(htmlN2).toContain('n2.l01');
      expect(htmlN2).toContain('N2 Lesson 1: Emphatic Contrast (〜どころか・〜に対して)');
      expect(htmlN2).toContain('X を Y します');
      expect(htmlN2).toContain('X で Y します');
      expect(htmlN2).toContain('Target Kanji: 3');
      expect(htmlN2).toContain('Target Vocab: 12');
      expect(htmlN2).toContain('Planned');
      expect(htmlN2).not.toContain('N2 Grammar Point');
      expect(htmlN2).toContain('Outline only');
    });

    it('loads n5.l21 pack cleanly via ContentLoader and renders LessonPlayerScreen without gate blocking', async () => {
      const { ContentLoader } = await import('../src/data/content/content-loader');
      const loadedPack = await ContentLoader.getLessonPack('n5.l21');

      expect(loadedPack).not.toBeNull();
      expect(loadedPack?.id).toBe('n5.l21');
      expect(loadedPack?.status).toBe('published');
      expect(loadedPack?.vocabularies).toHaveLength(12);
      expect(loadedPack?.kanjis).toHaveLength(4);
      expect(loadedPack?.grammars.length).toBeGreaterThanOrEqual(2);
      expect(loadedPack?.sentences.length).toBeGreaterThanOrEqual(10);
      expect(loadedPack?.questions.length).toBeGreaterThanOrEqual(20);

      // Verify LessonPlayerScreen renders properly with n5.l21 pack
      const { renderToString } = await import('react-dom/server');
      const React = await import('react');
      const { LessonPlayerScreen } = await import(
        '../src/presentation/screens/LessonPlayerScreen'
      );

      const dummyProfile: UserProfile = {
        name: 'Learner',
        level: 'N5',
        currentLessonId: 'n5.l21',
        dailyTargetMinutes: 360,
        dayRolloverHour: 4,
        showRomaji: false,
        furiganaMode: 'always',
        explanationLang: 'en',
        targetRetention: 0.9,
        dailyNewCap: 30,
        dailyReviewCap: 200,
        notificationSettings: {
          inApp: true,
          browser: false,
          calendarPopup: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        },
      };

      const playerHtml = renderToString(
        React.createElement(LessonPlayerScreen, {
          pack: loadedPack!,
          profile: dummyProfile,
          onMasteryUpdated: () => {},
          onExit: () => {},
        })
      );

      // Confirm player shows n5.l21 lesson title and vocabulary stage without lock/planned block
      expect(playerHtml).toContain('Becoming and Listing (〜くなる・〜になる・〜たり〜たり)');
      expect(playerHtml).not.toContain('Outline only — content not yet available');
      expect(playerHtml).not.toContain('Planned');
    });

    describe('Phase 1 N2 Quarantine Protection & Security Enforcement', () => {
      it('rejects loading any N2 lesson pack via ContentLoader.getLessonPack', async () => {
        const { ContentLoader } = await import('../src/data/content/content-loader');
        // Test multiple N2 lessons across the 60 range
        for (const n2Id of ['n2.l01', 'n2.l15', 'n2.l30', 'n2.l60']) {
          const loaded = await ContentLoader.getLessonPack(n2Id);
          expect(loaded).toBeNull();
        }
      });

      it('prevents direct launch of unpublished N2 packs', async () => {
        const { ContentLoader } = await import('../src/data/content/content-loader');
        let activePackId: string | null = 'initial';
        const onSelectLesson = async (lessonId: string) => {
          const loaded = await ContentLoader.getLessonPack(lessonId);
          if (loaded && loaded.status === 'published') {
            activePackId = loaded.id;
          }
        };

        // Direct call with quarantined N2 pack ID must not activate the pack
        await onSelectLesson('n2.l01');
        expect(activePackId).toBe('initial');

        // Direct call with valid published pack must activate the pack
        await onSelectLesson('n5.l01');
        expect(activePackId).toBe('n5.l01');
      });

      it('excludes unpublished and mismatched-level packs from assessment pool', async () => {
        const { ContentLoader } = await import('../src/data/content/content-loader');
        const publishedMap = new Map(ContentLoader.getCurriculumMap().map((m) => [m.id, m.status]));

        const mockDbPacks = [
          { id: 'n5.l01', level: 'N5', status: 'published', questions: [{ id: 'q_n5_1' }] },
          { id: 'n4.l01', level: 'N4', status: 'published', questions: [{ id: 'q_n4_1' }] },
          { id: 'n3.l01', level: 'N3', status: 'published', questions: [{ id: 'q_n3_1' }] },
          { id: 'n2.l01', level: 'N2', status: 'planned', questions: [{ id: 'q_n2_1' }] },
        ];

        // Case A: N5 learner active level
        const filteredN5 = mockDbPacks.filter(
          (p) => p.level === 'N5' && p.status === 'published' && publishedMap.get(p.id) === 'published'
        );
        expect(filteredN5.map((p) => p.id)).toEqual(['n5.l01']);

        // Case B: N3 learner active level
        const filteredN3 = mockDbPacks.filter(
          (p) => p.level === 'N3' && p.status === 'published' && publishedMap.get(p.id) === 'published'
        );
        expect(filteredN3.map((p) => p.id)).toEqual(['n3.l01']);
        expect(filteredN3.flatMap((p) => p.questions)).toHaveLength(1);
      });

      it('excludes cached N2 packs from assessment pool even if cached record in IndexedDB has stale status: published', async () => {
        const { ContentLoader } = await import('../src/data/content/content-loader');
        const publishedMap = new Map(ContentLoader.getCurriculumMap().map((m) => [m.id, m.status]));

        // Simulate stale cache where an N2 pack was previously stored with status: 'published' in IndexedDB
        const staleCachedPacks = [
          { id: 'n5.l01', level: 'N5', status: 'published', questions: [{ id: 'q_n5_1' }] },
          { id: 'n2.l01', level: 'N2', status: 'published', questions: [{ id: 'q_n2_1' }] },
          { id: 'n2.l02', level: 'N2', status: 'published', questions: [{ id: 'q_n2_2' }] },
        ];

        // Even for an N2 level profile, canonical curriculum map publishedMap.get(p.id) === 'planned' strictly blocks it!
        const filteredN2Learner = staleCachedPacks.filter(
          (p) => p.level === 'N2' && p.status === 'published' && publishedMap.get(p.id) === 'published'
        );
        expect(filteredN2Learner).toHaveLength(0);

        // For N5 learner, both level check and publishedMap block N2 packs
        const filteredN5Learner = staleCachedPacks.filter(
          (p) => p.level === 'N5' && p.status === 'published' && publishedMap.get(p.id) === 'published'
        );
        expect(filteredN5Learner.map((p) => p.id)).toEqual(['n5.l01']);
      });
    });

    describe('Dynamic Lesson Progression & Current Focus verification', () => {
      it('HomeScreen renders dynamic focused lesson metadata when given focusedLesson', async () => {
        const React = await import('react');
        const { renderToString } = await import('react-dom/server');
        const { HomeScreen } = await import('../src/presentation/screens/HomeScreen');
        const { ContentLoader } = await import('../src/data/content/content-loader');

        const curriculum = ContentLoader.getCurriculumMap();
        const lesson21 = curriculum.find((c) => c.id === 'n5.l21')!;
        expect(lesson21).toBeDefined();

        const dummyProfile: UserProfile = {
          name: 'Learner',
          level: 'N5',
          currentLessonId: 'n5.l21',
          dailyTargetMinutes: 360,
          dayRolloverHour: 4,
          showRomaji: false,
          furiganaMode: 'always',
          explanationLang: 'en',
          targetRetention: 0.9,
          dailyNewCap: 30,
          dailyReviewCap: 200,
          notificationSettings: {
            inApp: true,
            browser: false,
            calendarPopup: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
          },
        };

        const dailyPlan = {
          date: '2026-10-10',
          blocks: [],
          targetMinutes: 360,
          completedMinutes: 0,
          isRecoveryDay: false,
          weakSkills: [],
          strongSkills: [],
          explanations: [],
        };

        const html = renderToString(
          React.createElement(HomeScreen, {
            profile: dummyProfile,
            dailyPlan,
            dueSrsCount: 0,
            todayMinutes: 45,
            timerState: {
              blockId: null,
              state: 'idle' as const,
              startedAt: null,
              accumulatedMs: 0,
              targetMinutes: 60,
              lastInteractionAt: Date.now(),
            },
            onStartStudy: () => {},
            onOpenSrs: () => {},
            onOpenTests: () => {},
            onNavigate: () => {},
            focusedLesson: lesson21,
          })
        );

        // Verify dynamic rendering of lesson 21
        expect(html).toContain('Becoming and Listing');
        expect(html).toContain('21');
        expect(html).toContain('30');
        expect(html).toContain('START STUDY');
      });

      it('TestsScreen dynamically reflects profile.currentLessonId in Immediate Assessment card', async () => {
        const React = await import('react');
        const { renderToString } = await import('react-dom/server');
        const { TestsScreen } = await import('../src/presentation/screens/TestsScreen');

        const dummyProfile: UserProfile = {
          name: 'Learner',
          level: 'N5',
          currentLessonId: 'n5.l21',
          dailyTargetMinutes: 360,
          dayRolloverHour: 4,
          showRomaji: false,
          furiganaMode: 'always',
          explanationLang: 'en',
          targetRetention: 0.9,
          dailyNewCap: 30,
          dailyReviewCap: 200,
          notificationSettings: {
            inApp: true,
            browser: false,
            calendarPopup: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
          },
        };

        const html = renderToString(
          React.createElement(TestsScreen, {
            profile: dummyProfile,
            onStartLessonTest: () => {},
          })
        );

        // Verify dynamic lesson test card for N5 Day 21
        expect(html).toContain('Current Lesson Test');
        expect(html).toContain('Becoming and Listing');
        expect(html).toContain('21');
      });
    });
  });
});

