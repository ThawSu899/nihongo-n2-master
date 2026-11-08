import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { QuarantineEngine, quarantineCard } from '../src/domain/fsrs/quarantine-engine';
import { QuarantinedCard, GhostCardReason } from '../src/domain/fsrs/quarantine-types';
import { db } from '../src/data/db/dexie-db';

describe('QuarantineEngine (FSRS Ghost Card Quarantine)', () => {
  describe('evaluateForQuarantine', () => {
    it('quarantines cards with high lapse count (>= 3)', () => {
      const result = QuarantineEngine.evaluateForQuarantine({
        lapses: 3,
        difficulty: 5.0,
        stability: 2.0,
      });

      expect(result.shouldQuarantine).toBe(true);
      expect(result.reason).toBe('HIGH_LAPSE_COUNT');
    });

    it('quarantines cards with extreme difficulty (>= 8.5) and low stability (<= 1.2)', () => {
      const result = QuarantineEngine.evaluateForQuarantine({
        lapses: 1,
        difficulty: 8.8,
        stability: 1.0,
      });

      expect(result.shouldQuarantine).toBe(true);
      expect(result.reason).toBe('LOW_STABILITY_PLATEAU');
    });

    it('quarantines cards with repeated mock test failures (>= 2)', () => {
      const result = QuarantineEngine.evaluateForQuarantine({
        lapses: 1,
        difficulty: 6.0,
        stability: 3.0,
        mockFailCount: 2,
      });

      expect(result.shouldQuarantine).toBe(true);
      expect(result.reason).toBe('MOCK_TEST_REPEATED_MISS');
    });

    it('quarantines cards with prolonged Burmese latency (> 25000ms) and multiple lapses', () => {
      const result = QuarantineEngine.evaluateForQuarantine({
        lapses: 2,
        difficulty: 6.0,
        stability: 2.5,
        responseTimeMs: 30000,
      });

      expect(result.shouldQuarantine).toBe(true);
      expect(result.reason).toBe('BURMESE_MISALIGNMENT');
    });

    it('does not quarantine cards with healthy FSRS parameters', () => {
      const result = QuarantineEngine.evaluateForQuarantine({
        lapses: 1,
        difficulty: 5.2,
        stability: 4.8,
        mockFailCount: 0,
        responseTimeMs: 3200,
      });

      expect(result.shouldQuarantine).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('processDrillResult', () => {
    const baseCard: QuarantinedCard = {
      id: 'test-card-1',
      itemType: 'vocabulary',
      wordOrPattern: '直す',
      reading: 'なおす',
      meaningBurmese: 'ပြင်ဆင်သည်၊ ပြန်လုပ်သည်',
      meaningEn: 'Fix / repair',
      jlptLevel: 'N2',
      quarantineReason: 'HIGH_LAPSE_COUNT',
      quarantinedAt: 1000000,
      lapses: 4,
      currentStability: 1.0,
      currentDifficulty: 8.0,
      recoveryStreak: 0,
      isGraduated: false,
    };

    it('advances recovery streak on correct answer without graduating below target', () => {
      const step1 = QuarantineEngine.processDrillResult(baseCard, true);
      expect(step1.updatedCard.recoveryStreak).toBe(1);
      expect(step1.graduatedNow).toBe(false);
      expect(step1.updatedCard.isGraduated).toBe(false);

      const step2 = QuarantineEngine.processDrillResult(step1.updatedCard, true);
      expect(step2.updatedCard.recoveryStreak).toBe(2);
      expect(step2.graduatedNow).toBe(false);
      expect(step2.updatedCard.isGraduated).toBe(false);
    });

    it('graduates card when reaching target streak (3) and boosts stability', () => {
      const cardNearGraduation: QuarantinedCard = {
        ...baseCard,
        recoveryStreak: 2,
      };

      const step3 = QuarantineEngine.processDrillResult(cardNearGraduation, true);
      expect(step3.updatedCard.recoveryStreak).toBe(3);
      expect(step3.graduatedNow).toBe(true);
      expect(step3.updatedCard.isGraduated).toBe(true);
      expect(step3.boostedStability).toBeGreaterThanOrEqual(3.5);
      expect(step3.updatedCard.currentStability).toBe(step3.boostedStability);
    });

    it('resets recovery streak to 0 and increments lapses on incorrect drill attempt', () => {
      const cardWithStreak: QuarantinedCard = {
        ...baseCard,
        recoveryStreak: 2,
        lapses: 4,
      };

      const failResult = QuarantineEngine.processDrillResult(cardWithStreak, false);
      expect(failResult.updatedCard.recoveryStreak).toBe(0);
      expect(failResult.updatedCard.lapses).toBe(5);
      expect(failResult.graduatedNow).toBe(false);
      expect(failResult.updatedCard.isGraduated).toBe(false);
    });
  });

  describe('computeStats', () => {
    it('correctly aggregates active, graduated, byLevel, and byReason counts', () => {
      const testCards: QuarantinedCard[] = [
        {
          id: 'c1',
          itemType: 'vocabulary',
          wordOrPattern: '際',
          reading: 'さい',
          meaningBurmese: 'အခါ',
          meaningEn: 'Time / occasion',
          jlptLevel: 'N2',
          quarantineReason: 'HIGH_LAPSE_COUNT',
          quarantinedAt: 1,
          lapses: 3,
          currentStability: 1.0,
          currentDifficulty: 8.0,
          recoveryStreak: 3,
          isGraduated: true,
        },
        {
          id: 'c2',
          itemType: 'grammar',
          wordOrPattern: '〜に際して',
          reading: 'にさいして',
          meaningBurmese: 'ပြုလုပ်ရာတွင်',
          meaningEn: 'On the occasion of',
          jlptLevel: 'N2',
          quarantineReason: 'LOW_STABILITY_PLATEAU',
          quarantinedAt: 2,
          lapses: 2,
          currentStability: 0.8,
          currentDifficulty: 9.0,
          recoveryStreak: 1,
          isGraduated: false,
        },
        {
          id: 'c3',
          itemType: 'vocabulary',
          wordOrPattern: '辛い',
          reading: 'からい',
          meaningBurmese: 'စပ်သော',
          meaningEn: 'Spicy',
          jlptLevel: 'N5',
          quarantineReason: 'BURMESE_MISALIGNMENT',
          quarantinedAt: 3,
          lapses: 2,
          currentStability: 1.5,
          currentDifficulty: 6.0,
          recoveryStreak: 0,
          isGraduated: false,
        },
      ];

      const stats = QuarantineEngine.computeStats(testCards);
      expect(stats.totalQuarantined).toBe(3);
      expect(stats.activeCount).toBe(2);
      expect(stats.graduatedCount).toBe(1);
      expect(stats.byLevel.N2).toBe(2);
      expect(stats.byLevel.N5).toBe(1);
      expect(stats.byLevel.N3).toBe(0);
      expect(stats.byReason.HIGH_LAPSE_COUNT).toBe(1);
      expect(stats.byReason.LOW_STABILITY_PLATEAU).toBe(1);
      expect(stats.byReason.BURMESE_MISALIGNMENT).toBe(1);
      expect(stats.byReason.MOCK_TEST_REPEATED_MISS).toBe(0);
    });
  });

  describe('buildQuarantinedCard & quarantineCard (Auto-Quarantine & Idempotency)', () => {
    it('builds a new QuarantinedCard with appropriate FSRS default parameters', () => {
      const card = QuarantineEngine.buildQuarantinedCard({
        id: 'test-v01',
        itemType: 'vocabulary',
        wordOrPattern: '直す',
        reading: 'なおす',
        meaningBurmese: 'ပြင်ဆင်သည်',
        meaningEn: 'Fix',
        jlptLevel: 'N2',
        quarantineReason: 'HIGH_LAPSE_COUNT',
      });

      expect(card.id).toBe('test-v01');
      expect(card.lapses).toBe(1);
      expect(card.recoveryStreak).toBe(0);
      expect(card.isGraduated).toBe(false);
      expect(card.currentStability).toBe(0.8);
      expect(card.currentDifficulty).toBe(8.5);
      expect(card.quarantineReason).toBe('HIGH_LAPSE_COUNT');
    });

    it('updates existing QuarantinedCard idempotently: increments lapses and revokes graduation', () => {
      const existing: QuarantinedCard = {
        id: 'test-v01',
        itemType: 'vocabulary',
        wordOrPattern: '直す',
        reading: 'なおす',
        meaningBurmese: 'ပြင်ဆင်သည်',
        meaningEn: 'Fix',
        jlptLevel: 'N2',
        quarantineReason: 'HIGH_LAPSE_COUNT',
        quarantinedAt: 1000,
        lapses: 2,
        currentStability: 2.5,
        currentDifficulty: 7.0,
        recoveryStreak: 3,
        isGraduated: true,
      };

      const updated = QuarantineEngine.buildQuarantinedCard(
        {
          id: 'test-v01',
          itemType: 'vocabulary',
          wordOrPattern: '直す',
          meaningBurmese: 'ပြင်ဆင်သည်',
          jlptLevel: 'N2',
          quarantineReason: 'MOCK_TEST_REPEATED_MISS',
        },
        existing
      );

      expect(updated.id).toBe('test-v01');
      expect(updated.lapses).toBe(3);
      expect(updated.recoveryStreak).toBe(0);
      expect(updated.isGraduated).toBe(false); // Graduation revoked due to new lapse
      expect(updated.currentStability).toBeLessThanOrEqual(0.8);
      expect(updated.currentDifficulty).toBeGreaterThanOrEqual(8.5);
      expect(updated.quarantinedAt).toBeGreaterThan(1000);
    });

    it('asynchronously persists to Dexie DB and maintains strict single-entry idempotency', async () => {
      const cardId = 'idb-test-v99';
      // First quarantine event
      await quarantineCard({
        id: cardId,
        itemType: 'vocabulary',
        wordOrPattern: '勉強',
        reading: 'べんきょう',
        meaningBurmese: 'စာလေ့လာသည်',
        meaningEn: 'Study',
        jlptLevel: 'N5',
        quarantineReason: 'HIGH_LAPSE_COUNT',
      });

      const firstFetch = await db.quarantined_cards.get(cardId);
      expect(firstFetch).toBeDefined();
      expect(firstFetch?.lapses).toBe(1);

      // Second quarantine event for same card
      await quarantineCard({
        id: cardId,
        itemType: 'vocabulary',
        wordOrPattern: '勉強',
        reading: 'べんきょう',
        meaningBurmese: 'စာလေ့လာသည်',
        meaningEn: 'Study',
        jlptLevel: 'N5',
        quarantineReason: 'MOCK_TEST_REPEATED_MISS',
      });

      const secondFetch = await db.quarantined_cards.get(cardId);
      expect(secondFetch).toBeDefined();
      expect(secondFetch?.lapses).toBe(2);

      // Verify no duplicate row was created
      const allMatching = await db.quarantined_cards.where('id').equals(cardId).toArray();
      expect(allMatching.length).toBe(1);
    });
  });
});
