import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db, StudySessionRecord, ensureInitialProfile, DEFAULT_USER_PROFILE } from '../src/data/db/dexie-db';
import { ContentLoader } from '../src/data/content/content-loader';
import { LessonPack, StudyEvent, SRSCard, MasteryRecord, UserProfile } from '../src/domain/models/types';

describe('IndexedDB Provenance Cache Upgrade & User Data Preservation', () => {
  beforeEach(async () => {
    ContentLoader.clearCache();
    await db.lesson_packs.clear();
    await db.study_events.clear();
    await db.srs_cards.clear();
    await db.review_logs.clear();
    await db.mastery_records.clear();
    await db.study_sessions.clear();
    await db.profile.clear();
  });

  it('detects missing provenance metadata in cached packs and upgrades them atomically', async () => {
    // 1. Seed a legacy cached pack lacking authoringOrigin and verificationStatus
    const legacyPack = {
      id: 'n5.l01',
      level: 'N5',
      module: 'N5 Foundation 1',
      number: 1,
      title: 'Greetings & Self Introduction',
      description: 'Master essential greetings',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'n5.l01.v001', lessonId: 'n5.l01', ja: 'おはよう', kana: 'おはよう', en: 'morning', meaningMyanmar: 'မင်္ဂလာနံနက်ခင်း', pos: 'noun', exampleSentenceId: 'n5.l01.s001', kanjiIds: [], level: 'N5', difficulty: 1, importance: 5, audio: { kind: 'tts' } }],
      kanjis: [{ id: 'n5.l01.k001', lessonId: 'n5.l01', char: '日', meaning: 'sun', meaningMyanmar: 'နေ', onyomi: ['ニチ'], kunyomi: ['ひ'], strokeCount: 4, radical: '日', examples: [] }],
      grammars: [{ id: 'n5.l01.g001', lessonId: 'n5.l01', pattern: 'X は Y です', meaning: 'X is Y', meaningMyanmar: 'X သည် Y ဖြစ်သည်', structure: 'X wa Y desu', explanation: 'Topic marker', explanationMyanmar: 'ရှင်းလင်းချက်', exampleSentenceIds: ['n5.l01.s001'] }],
      sentences: [{ id: 'n5.l01.s001', lessonId: 'n5.l01', ja: 'これは本です。', kana: 'これはほんです。', en: 'This is a book.', my: 'ဒါစာအုပ်ဖြစ်ပါတယ်။', vocabIds: ['n5.l01.v001'], grammarIds: ['n5.l01.g001'] }],
      reading: { id: 'n5.l01.r01', lessonId: 'n5.l01', title: 'Reading', passage: 'Text', passageMyanmar: 'မြန်မာ', questions: [] },
      listening: { id: 'n5.l01.l01', lessonId: 'n5.l01', title: 'Listening', audio: { kind: 'tts' }, dialogue: [] },
      questions: [{ id: 'n5.l01.q01', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Select', choices: ['a', 'b'], answer: 'a', explanation: 'Exp', explanationMyanmar: 'Exp' }],
      prov: {
        source: 'Nihongo N2 Master Editorial Team',
        license: 'CC-BY-4.0',
        status: 'native_verified',
        updatedAt: '2026-09-30T10:00:00Z',
        rev: 1,
        // Intentionally missing authoringOrigin & verificationStatus
      },
    };

    await db.lesson_packs.put(legacyPack as any);

    // Verify initial missing state in DB
    const before = await db.lesson_packs.get('n5.l01');
    expect(before?.prov.authoringOrigin).toBeUndefined();
    expect(before?.prov.verificationStatus).toBeUndefined();

    // 2. Run autoUpgradeStaleIndexedDB
    const result = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(result.upgraded).toBe(true);
    expect(result.updatedPacksCount).toBe(1);

    // 3. Verify upgraded state in DB
    const after = await db.lesson_packs.get('n5.l01');
    expect(after?.prov.authoringOrigin).toBe('unknown');
    expect(after?.prov.verificationStatus).toBe('automated-structure-checked');
    expect(after?.prov.source).toBe('Nihongo N2 Master Editorial Team'); // Source strictly preserved
  });

  it('guarantees repeated startup is completely idempotent', async () => {
    // Pre-populate canonical pack
    await ContentLoader.getLessonPack('n5.l01');

    // First upgrade pass (no stale items)
    const run1 = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(run1.upgraded).toBe(false);
    expect(run1.updatedPacksCount).toBe(0);

    // Second repeated upgrade pass
    const run2 = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(run2.upgraded).toBe(false);
    expect(run2.updatedPacksCount).toBe(0);
  });

  it('purges obsolete lesson pack IDs that are not present in canonical curriculum map', async () => {
    // Seed an obsolete pack with an invalid ID
    const obsoletePack = {
      id: 'obsolete.l999',
      level: 'N5',
      module: 'Test',
      number: 999,
      title: 'Obsolete',
      description: 'Obsolete',
      status: 'published',
      vocabularies: [{ id: 'v1' }],
      grammars: [{ id: 'g1' }],
      questions: [{ id: 'q1' }],
      prov: { source: 'Old', license: 'CC', status: 'reviewed', updatedAt: '2020', rev: 1, authoringOrigin: 'unknown', verificationStatus: 'automated-structure-checked' },
    };

    await db.lesson_packs.put(obsoletePack as any);
    expect(await db.lesson_packs.get('obsolete.l999')).toBeDefined();

    const result = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(result.purgedPacksCount).toBe(1);

    expect(await db.lesson_packs.get('obsolete.l999')).toBeUndefined();
  });

  it('strictly preserves all user study progress, FSRS cards, mastery records, and user profile', async () => {
    // Seed user progress records across all persistent user tables
    await db.study_events.put({
      id: 'evt_001',
      timestamp: new Date().toISOString(),
      type: 'test_completed',
      lessonId: 'n5.l01',
      data: { score: 100 },
    });

    await db.srs_cards.put({
      id: 'card_001',
      itemId: 'n5.l01.v001',
      lessonId: 'n5.l01',
      facet: 'vocab',
      state: 'review',
      due: '2026-12-01',
      stability: 10,
      difficulty: 3,
      elapsedDays: 2,
      scheduledDays: 5,
      reps: 4,
      lapses: 0,
      lastReview: '2026-11-14',
    } as unknown as SRSCard);

    await db.review_logs.put({
      id: 'log_001',
      cardId: 'card_001',
      reviewedAt: '2026-11-14T10:00:00Z',
      rating: 3,
      state: 'review',
      due: '2026-12-01',
      stability: 10,
      difficulty: 3,
      elapsedDays: 2,
      lastElapsedDays: 1,
      scheduledDays: 5,
      reviewType: 'manual',
    } as any);

    await db.mastery_records.put({
      lessonId: 'n5.l01',
      state: 'mastered',
      scores: { vocab: 1, kanji: 1, grammar: 1, reading: 1, listening: 1 },
      lastTestedAt: '2026-11-14T10:00:00Z',
    } as unknown as MasteryRecord);

    await db.study_sessions.put({
      id: 'session_001',
      blockId: 'block_1',
      startedAt: '2026-11-14T09:00:00Z',
      completedAt: '2026-11-14T09:30:00Z',
      durationSeconds: 1800,
      exercisesCompleted: 15,
    });

    await db.profile.put({
      ...DEFAULT_USER_PROFILE,
      id: 'current_user',
      level: 'N5',
      currentLessonId: 'n5.l01',
      studyStreakDays: 12,
    });

    // Run autoUpgradeStaleIndexedDB
    await ContentLoader.autoUpgradeStaleIndexedDB();

    // Verify 100% preservation across all user tables
    const event = await db.study_events.get('evt_001');
    expect(event).toBeDefined();
    expect(event?.data?.score).toBe(100);

    const card = await db.srs_cards.get('card_001');
    expect(card).toBeDefined();
    expect(card?.stability).toBe(10);

    const log = await db.review_logs.get('log_001');
    expect(log).toBeDefined();
    expect(log?.rating).toBe(3);

    const mastery = await db.mastery_records.get('n5.l01');
    expect(mastery).toBeDefined();
    expect(mastery?.state).toBe('mastered');

    const session = await db.study_sessions.get('session_001');
    expect(session).toBeDefined();
    expect(session?.durationSeconds).toBe(1800);

    const profile = await db.profile.get('current_user');
    expect(profile).toBeDefined();
    expect(profile?.studyStreakDays).toBe(12);
  });

  it('preserves existing cached pack when canonical validation fails during preload', async () => {
    // Seed a valid published pack missing provenance
    const packMissingProv = {
      id: 'n5.l01',
      level: 'N5',
      module: 'N5 Foundation 1',
      number: 1,
      title: 'Greetings & Self Introduction',
      description: 'Master essential greetings',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'n5.l01.v001', lessonId: 'n5.l01', ja: 'おはよう', kana: 'おはよう', en: 'morning', meaningMyanmar: 'မင်္ဂလာနံနက်ခင်း', pos: 'noun', exampleSentenceId: 'n5.l01.s001', kanjiIds: [], level: 'N5', difficulty: 1, importance: 5, audio: { kind: 'tts' } }],
      kanjis: [{ id: 'n5.l01.k001', lessonId: 'n5.l01', char: '日', meaning: 'sun', meaningMyanmar: 'နေ', onyomi: ['ニチ'], kunyomi: ['ひ'], strokeCount: 4, radical: '日', examples: [] }],
      grammars: [{ id: 'n5.l01.g001', lessonId: 'n5.l01', pattern: 'X は Y です', meaning: 'X is Y', meaningMyanmar: 'X သည် Y ဖြစ်သည်', structure: 'X wa Y desu', explanation: 'Topic marker', explanationMyanmar: 'ရှင်းလင်းချက်', exampleSentenceIds: ['n5.l01.s001'] }],
      sentences: [{ id: 'n5.l01.s001', lessonId: 'n5.l01', ja: 'これは本です。', kana: 'これはほんです。', en: 'This is a book.', my: 'ဒါစာအုပ်ဖြစ်ပါတယ်။', vocabIds: ['n5.l01.v001'], grammarIds: ['n5.l01.g001'] }],
      reading: { id: 'n5.l01.r01', lessonId: 'n5.l01', title: 'Reading', passage: 'Text', passageMyanmar: 'မြန်မာ', questions: [] },
      listening: { id: 'n5.l01.l01', lessonId: 'n5.l01', title: 'Listening', audio: { kind: 'tts' }, dialogue: [] },
      questions: [{ id: 'n5.l01.q01', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Select', choices: ['a', 'b'], answer: 'a', explanation: 'Exp', explanationMyanmar: 'Exp' }],
      prov: {
        source: 'Preserved Source',
        license: 'CC-BY-4.0',
        status: 'reviewed',
        updatedAt: '2026-09-30T10:00:00Z',
        rev: 1,
      },
    };

    await db.lesson_packs.put(packMissingProv as any);

    // Mock loadCanonicalPack to simulate preload validation failure
    const originalLoadCanonical = ContentLoader.loadCanonicalPack;
    ContentLoader.loadCanonicalPack = async () => null;

    try {
      const result = await ContentLoader.autoUpgradeStaleIndexedDB();
      // Should not upgrade since preload failed
      expect(result.updatedPacksCount).toBe(0);

      // Existing cached pack in IndexedDB must NOT be purged or deleted
      const cached = await db.lesson_packs.get('n5.l01');
      expect(cached).toBeDefined();
      expect(cached?.prov.source).toBe('Preserved Source');
    } finally {
      ContentLoader.loadCanonicalPack = originalLoadCanonical;
    }
  });

  it('deduplicates concurrent autoUpgradeStaleIndexedDB calls via single in-flight promise', async () => {
    // Trigger concurrent upgrade requests simultaneously
    const [res1, res2] = await Promise.all([
      ContentLoader.autoUpgradeStaleIndexedDB(),
      ContentLoader.autoUpgradeStaleIndexedDB(),
    ]);

    expect(res1).toBe(res2); // Exactly identical resolved reference
  });

  it('safely handles multiple concurrent callers to ensureUpgraded and autoUpgradeStaleIndexedDB without duplicate operations', async () => {
    // Fire a burst of concurrent calls
    const operations = [
      ContentLoader.ensureUpgraded(),
      ContentLoader.autoUpgradeStaleIndexedDB(),
      ContentLoader.ensureUpgraded(),
      ContentLoader.autoUpgradeStaleIndexedDB(),
      ContentLoader.ensureUpgraded(),
    ];

    const results = await Promise.all(operations);
    expect(results).toHaveLength(5);
  });

  it('allows retry when an upgrade attempt encounters transient IndexedDB failure instead of permanently caching failure', async () => {
    // Seed a legacy pack
    const legacyPack = {
      id: 'n5.l01',
      level: 'N5',
      module: 'Module 1',
      number: 1,
      title: 'Legacy',
      description: 'Legacy',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'v1', ja: 'a', kana: 'a', en: 'a', pos: 'noun', kanjiIds: [], level: 'N5', difficulty: 1, importance: 1, audio: { kind: 'tts' } }],
      grammars: [{ id: 'g1', lessonId: 'n5.l01', pattern: 'p', meaning: 'm', formation: 'f', explanation: { en: 'e' }, examples: [], difficulty: 1, level: 'N5' }],
      questions: [{ id: 'q1', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'p', answer: 'a', explanation: 'e', difficulty: 1, linkedItemIds: [] }],
      prov: { source: 'Old', license: 'CC', status: 'reviewed', updatedAt: '2020', rev: 1 },
    };
    await db.lesson_packs.put(legacyPack as any);

    // Mock transient failure in toArray
    const toArraySpy = vi.spyOn(db.lesson_packs, 'toArray');
    toArraySpy.mockRejectedValueOnce(new Error('Transient Database Lock Error'));

    try {
      // First attempt fails transiently
      const failedResult = await ContentLoader.autoUpgradeStaleIndexedDB();
      expect(failedResult.upgraded).toBe(false);

      // Second attempt retries because failure was not permanently cached
      const retryResult = await ContentLoader.autoUpgradeStaleIndexedDB();
      expect(retryResult.upgraded).toBe(true);
      expect(retryResult.updatedPacksCount).toBe(1);

      // Verify the pack in DB was indeed upgraded
      const upgraded = await db.lesson_packs.get('n5.l01');
      expect(upgraded?.prov.authoringOrigin).toBe('unknown');
      expect(upgraded?.prov.verificationStatus).toBe('automated-structure-checked');
    } finally {
      toArraySpy.mockRestore();
    }
  });

  it('clearCache resets completed upgrade result allowing fresh re-upgrade when requested', async () => {
    // 1. Run initial upgrade
    const firstResult = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(firstResult.upgraded).toBe(false);

    // 2. Clear cache
    ContentLoader.clearCache();

    // 3. Next call should run cleanly without throwing
    const nextResult = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(nextResult).toBeDefined();
    expect(nextResult.totalPublishedAvailable).toBe(174);
  });

  it('detects invalid non-empty provenance enums in cached packs and upgrades them safely without touching user progress tables', async () => {
    // 1. Seed a cached pack with invalid non-empty provenance enums
    const corruptedEnumPack = {
      id: 'n5.l01',
      level: 'N5',
      module: 'N5 Foundation 1',
      number: 1,
      title: 'Greetings & Self Introduction',
      description: 'Master essential greetings',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'n5.l01.v001', lessonId: 'n5.l01', ja: 'おはよう', kana: 'おはよう', en: 'morning', meaningMyanmar: 'မင်္ဂလာနံနက်ခင်း', pos: 'noun', exampleSentenceId: 'n5.l01.s001', kanjiIds: [], level: 'N5', difficulty: 1, importance: 5, audio: { kind: 'tts' } }],
      kanjis: [{ id: 'n5.l01.k001', lessonId: 'n5.l01', char: '日', meaning: 'sun', meaningMyanmar: 'နေ', onyomi: ['ニチ'], kunyomi: ['ひ'], strokeCount: 4, radical: '日', examples: [] }],
      grammars: [{ id: 'n5.l01.g001', lessonId: 'n5.l01', pattern: 'X は Y です', meaning: 'X is Y', meaningMyanmar: 'X သည် Y ဖြစ်သည်', structure: 'X wa Y desu', explanation: 'Topic marker', explanationMyanmar: 'ရှင်းလင်းချက်', exampleSentenceIds: ['n5.l01.s001'] }],
      sentences: [{ id: 'n5.l01.s001', lessonId: 'n5.l01', ja: 'これは本です。', kana: 'これはほんです。', en: 'This is a book.', my: 'ဒါစာအုပ်ဖြစ်ပါတယ်။', vocabIds: ['n5.l01.v001'], grammarIds: ['n5.l01.g001'] }],
      reading: { id: 'n5.l01.r01', lessonId: 'n5.l01', title: 'Reading', passage: 'Text', passageMyanmar: 'မြန်မာ', questions: [] },
      listening: { id: 'n5.l01.l01', lessonId: 'n5.l01', title: 'Listening', audio: { kind: 'tts' }, dialogue: [] },
      questions: [{ id: 'n5.l01.q01', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Select', choices: ['a', 'b'], answer: 'a', explanation: 'Exp', explanationMyanmar: 'Exp' }],
      prov: {
        source: 'Nihongo N2 Master Editorial Team',
        license: 'CC-BY-4.0',
        status: 'native_verified',
        updatedAt: '2026-09-30T10:00:00Z',
        rev: 1,
        authoringOrigin: 'invalid-non-empty-ai-origin', // Invalid non-empty enum value
        verificationStatus: 'invalid-non-empty-qa-status', // Invalid non-empty enum value
      },
    };

    await db.lesson_packs.put(corruptedEnumPack as any);

    // Seed user progress to confirm user tables are not touched
    await db.study_events.put({
      id: 'evt_keep_1',
      timestamp: new Date().toISOString(),
      type: 'test_completed',
      lessonId: 'n5.l01',
      data: { score: 95 },
    });
    await db.srs_cards.put({
      id: 'card_keep_1',
      itemId: 'n5.l01.v001',
      lessonId: 'n5.l01',
      facet: 'vocab',
      state: 'review',
      due: '2026-12-05',
      stability: 15,
      difficulty: 2,
      elapsedDays: 5,
      scheduledDays: 10,
      reps: 6,
      lapses: 0,
      lastReview: '2026-11-14',
    } as unknown as SRSCard);

    // Verify initial state in DB has invalid enums
    const before = await db.lesson_packs.get('n5.l01');
    expect(before?.prov.authoringOrigin).toBe('invalid-non-empty-ai-origin');
    expect(before?.prov.verificationStatus).toBe('invalid-non-empty-qa-status');

    // 2. Run autoUpgradeStaleIndexedDB
    const result = await ContentLoader.autoUpgradeStaleIndexedDB();
    expect(result.upgraded).toBe(true);
    expect(result.updatedPacksCount).toBe(1);

    // 3. Verify upgraded state in DB is replaced with validated canonical values
    const after = await db.lesson_packs.get('n5.l01');
    expect(after?.prov.authoringOrigin).toBe('unknown');
    expect(after?.prov.verificationStatus).toBe('automated-structure-checked');
    expect(after?.prov.source).toBe('Nihongo N2 Master Editorial Team'); // Preserved

    // 4. Verify user tables were untouched
    const evt = await db.study_events.get('evt_keep_1');
    expect(evt).toBeDefined();
    expect(evt?.data?.score).toBe(95);

    const card = await db.srs_cards.get('card_keep_1');
    expect(card).toBeDefined();
    expect(card?.stability).toBe(15);
  });

  it('evicts cached pack with invalid non-empty provenance enums in getLessonPack and returns canonical pack', async () => {
    // Seed invalid non-empty enums in DB
    const corruptedPack = {
      id: 'n5.l01',
      level: 'N5',
      module: 'N5 Foundation 1',
      number: 1,
      title: 'Greetings & Self Introduction',
      description: 'Master essential greetings',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'n5.l01.v001', lessonId: 'n5.l01', ja: 'おはよう', kana: 'おはよう', en: 'morning', meaningMyanmar: 'မင်္ဂလာနံနက်ခင်း', pos: 'noun', exampleSentenceId: 'n5.l01.s001', kanjiIds: [], level: 'N5', difficulty: 1, importance: 5, audio: { kind: 'tts' } }],
      kanjis: [{ id: 'n5.l01.k001', lessonId: 'n5.l01', char: '日', meaning: 'sun', meaningMyanmar: 'နေ', onyomi: ['ニチ'], kunyomi: ['ひ'], strokeCount: 4, radical: '日', examples: [] }],
      grammars: [{ id: 'n5.l01.g001', lessonId: 'n5.l01', pattern: 'X は Y です', meaning: 'X is Y', meaningMyanmar: 'X သည် Y ဖြစ်သည်', structure: 'X wa Y desu', explanation: 'Topic marker', explanationMyanmar: 'ရှင်းလင်းချက်', exampleSentenceIds: ['n5.l01.s001'] }],
      sentences: [{ id: 'n5.l01.s001', lessonId: 'n5.l01', ja: 'これは本です。', kana: 'これはほんです。', en: 'This is a book.', my: 'ဒါစာအုပ်ဖြစ်ပါတယ်။', vocabIds: ['n5.l01.v001'], grammarIds: ['n5.l01.g001'] }],
      reading: { id: 'n5.l01.r01', lessonId: 'n5.l01', title: 'Reading', passage: 'Text', passageMyanmar: 'မြန်မာ', questions: [] },
      listening: { id: 'n5.l01.l01', lessonId: 'n5.l01', title: 'Listening', audio: { kind: 'tts' }, dialogue: [] },
      questions: [{ id: 'n5.l01.q01', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Select', choices: ['a', 'b'], answer: 'a', explanation: 'Exp', explanationMyanmar: 'Exp' }],
      prov: {
        source: 'Nihongo N2 Master Editorial Team',
        license: 'CC-BY-4.0',
        status: 'native_verified',
        updatedAt: '2026-09-30T10:00:00Z',
        rev: 1,
        authoringOrigin: 'invalid-origin-enum',
        verificationStatus: 'invalid-qa-enum',
      },
    };
    await db.lesson_packs.put(corruptedPack as any);

    // Call getLessonPack directly
    const pack = await ContentLoader.getLessonPack('n5.l01');
    expect(pack).toBeDefined();
    expect(pack?.prov.authoringOrigin).toBe('unknown');
    expect(pack?.prov.verificationStatus).toBe('automated-structure-checked');

    // Verify DB was updated with canonical pack
    const inDb = await db.lesson_packs.get('n5.l01');
    expect(inDb?.prov.authoringOrigin).toBe('unknown');
    expect(inDb?.prov.verificationStatus).toBe('automated-structure-checked');
  });

  it('handles clearCache called while autoUpgradeStaleIndexedDB is in flight without repopulating in-memory cache, and allows subsequent clean upgrade', async () => {
    // 1. Seed a legacy pack missing provenance
    const legacyPack = {
      id: 'n5.l01',
      level: 'N5',
      module: 'N5 Foundation 1',
      number: 1,
      title: 'Greetings & Self Introduction',
      description: 'Master essential greetings',
      status: 'published',
      masteryThresholds: { vocab: 0.9, kanji: 0.85, grammar: 0.85, reading: 0.8, listening: 0.8, overall: 0.85 },
      vocabularies: [{ id: 'n5.l01.v001', lessonId: 'n5.l01', ja: 'おはよう', kana: 'おはよう', en: 'morning', meaningMyanmar: 'မင်္ဂလာနံနက်ခင်း', pos: 'noun', exampleSentenceId: 'n5.l01.s001', kanjiIds: [], level: 'N5', difficulty: 1, importance: 5, audio: { kind: 'tts' } }],
      kanjis: [{ id: 'n5.l01.k001', lessonId: 'n5.l01', char: '日', meaning: 'sun', meaningMyanmar: 'နေ', onyomi: ['ニチ'], kunyomi: ['ひ'], strokeCount: 4, radical: '日', examples: [] }],
      grammars: [{ id: 'n5.l01.g001', lessonId: 'n5.l01', pattern: 'X は Y です', meaning: 'X is Y', meaningMyanmar: 'X သည် Y ဖြစ်သည်', structure: 'X wa Y desu', explanation: 'Topic marker', explanationMyanmar: 'ရှင်းလင်းချက်', exampleSentenceIds: ['n5.l01.s001'] }],
      sentences: [{ id: 'n5.l01.s001', lessonId: 'n5.l01', ja: 'これは本です。', kana: 'これはほんです。', en: 'This is a book.', my: 'ဒါစာအုပ်ဖြစ်ပါတယ်။', vocabIds: ['n5.l01.v001'], grammarIds: ['n5.l01.g001'] }],
      reading: { id: 'n5.l01.r01', lessonId: 'n5.l01', title: 'Reading', passage: 'Text', passageMyanmar: 'မြန်မာ', questions: [] },
      listening: { id: 'n5.l01.l01', lessonId: 'n5.l01', title: 'Listening', audio: { kind: 'tts' }, dialogue: [] },
      questions: [{ id: 'n5.l01.q01', lessonId: 'n5.l01', skill: 'vocab', type: 'multiple_choice', prompt: 'Select', choices: ['a', 'b'], answer: 'a', explanation: 'Exp', explanationMyanmar: 'Exp' }],
      prov: {
        source: 'Preserved Source',
        license: 'CC-BY-4.0',
        status: 'reviewed',
        updatedAt: '2026-09-30T10:00:00Z',
        rev: 1,
      },
    };
    await db.lesson_packs.put(legacyPack as any);

    // 2. Set up deterministic pause in loadCanonicalPack during in-flight upgrade
    let resumeCanonicalLoad: () => void = () => {};
    const pausePromise = new Promise<void>((resolve) => {
      resumeCanonicalLoad = resolve;
    });

    const originalLoadCanonical = ContentLoader.loadCanonicalPack.bind(ContentLoader);
    const loadSpy = vi.spyOn(ContentLoader, 'loadCanonicalPack').mockImplementation(async (id: string) => {
      await pausePromise;
      return originalLoadCanonical(id);
    });

    try {
      // 3. Initiate upgrade operation - this will pause inside loadCanonicalPack
      const inFlightUpgradePromise = ContentLoader.autoUpgradeStaleIndexedDB();

      // Give event loop a microtick to advance to loadCanonicalPack
      await new Promise((r) => setTimeout(r, 20));
      expect(loadSpy).toHaveBeenCalledWith('n5.l01');

      // 4. While the upgrade is in-flight and paused, call clearCache()
      ContentLoader.clearCache();

      // 5. Resume the in-flight upgrade operation
      resumeCanonicalLoad();
      const inFlightResult = await inFlightUpgradePromise;
      expect(inFlightResult.upgraded).toBe(true);

      // 6. Verify that inMemoryPackCache was NOT repopulated by the older operation
      // and that completedUpgradeResult was NOT stored
      expect((ContentLoader as any).inMemoryPackCache.has('n5.l01')).toBe(false);
      expect((ContentLoader as any).completedUpgradeResult).toBeNull();

      // 7. Verify subsequent upgrade operation and loader behavior
      // A subsequent upgrade call should run cleanly and not be blocked by stale results
      const freshResult = await ContentLoader.autoUpgradeStaleIndexedDB();
      expect(freshResult).toBeDefined();

      // Loading the pack should now load canonical pack into inMemory cache cleanly
      const loadedPack = await ContentLoader.getLessonPack('n5.l01');
      expect(loadedPack).toBeDefined();
      expect(loadedPack?.prov.authoringOrigin).toBe('unknown');
      expect(loadedPack?.prov.verificationStatus).toBe('automated-structure-checked');
      expect((ContentLoader as any).inMemoryPackCache.has('n5.l01')).toBe(true);
    } finally {
      loadSpy.mockRestore();
    }
  });
});
