import { db } from '../../data/db/dexie-db';
import { GhostCardRecord, SRSCard, LessonPack } from '../models/types';

export const GHOST_STAGE_INTERVALS_HOURS: Record<1 | 2 | 3 | 4, number> = {
  1: 4,   // Stage 1: +4h
  2: 8,   // Stage 2: +8h
  3: 24,  // Stage 3: +24h
  4: 48,  // Stage 4: +48h
};

export class GhostScheduler {
  /**
   * Spawns an isolated Ghost Card when an SRS card accumulates >= 3 lapses (or becomes a leech).
   * Ensures idempotency: does not spawn a duplicate ghost if an unconquered ghost already exists.
   */
  static async spawnGhost(card: SRSCard, lessonPack?: LessonPack): Promise<GhostCardRecord | null> {
    // Only spawn if card has >= 3 lapses or is flagged as a leech
    if (card.lapses < 3 && !card.isLeech) {
      return null;
    }

    // Check if an unconquered ghost card already exists for this parentCard
    const existing = await db.ghost_cards
      .where('parentCardId')
      .equals(card.id)
      .and((g) => !g.conquered)
      .first();

    if (existing) {
      return existing;
    }

    // Determine sentence context and target pattern
    const grammarId = card.itemId;
    const clozeTarget = (card.reading || card.prompt).trim();
    let clozeSentence = card.exampleSentence || `${card.prompt}を使います。`;
    let sentenceIndex = 0;
    let nuanceEn = card.meaning;
    let nuanceMy: string | undefined = undefined;

    // If lesson pack is provided or can be queried from db, find alternative context sentence
    let pack = lessonPack;
    if (!pack && card.lessonId) {
      pack = await db.lesson_packs.get(card.lessonId);
    }

    if (pack) {
      const grammarItem = pack.grammars.find((g) => g.id === grammarId || g.pattern === card.prompt);
      if (grammarItem) {
        nuanceEn = grammarItem.explanation.en || card.meaning;
        nuanceMy = grammarItem.explanation.my;

        // Try to pick an alternate example sentence if available
        if (grammarItem.examples && grammarItem.examples.length > 0) {
          const sentences = grammarItem.examples
            .map((ex, idx) => {
              const s = pack?.sentences.find((sent) => sent.id === ex.sentenceId);
              return s ? { sentence: s, index: idx } : null;
            })
            .filter((s): s is { sentence: any; index: number } => s !== null);

          if (sentences.length > 0) {
            // Find a sentence that is not identical to current card.exampleSentence
            const alternate = sentences.find((s) => s.sentence.ja !== card.exampleSentence) || sentences[0];
            clozeSentence = alternate.sentence.ja;
            sentenceIndex = alternate.index;
          }
        }
      }
    }

    // If the sentence does not contain a blank, mask the clozeTarget
    if (!clozeSentence.includes('____') && clozeSentence.includes(clozeTarget)) {
      clozeSentence = clozeSentence.replace(clozeTarget, '____');
    }

    const now = new Date();
    const dueTime = new Date(now.getTime() + GHOST_STAGE_INTERVALS_HOURS[1] * 3600 * 1000);

    const ghost: GhostCardRecord = {
      id: `ghost_${card.id}_${Date.now()}`,
      parentCardId: card.id,
      grammarId,
      sentenceIndex,
      clozeSentence,
      clozeTarget,
      nuanceExplanationEn: nuanceEn,
      nuanceExplanationMy: nuanceMy,
      stage: 1,
      due: dueTime.toISOString(),
      conquered: false,
    };

    await db.ghost_cards.put(ghost);
    return ghost;
  }

  /**
   * Advances or demotes a ghost card depending on review performance.
   * Passing stage 4 conquers/exorcises the ghost.
   * Failing at any stage resets the ghost back to stage 1 (+4h interval).
   */
  static async advanceGhost(ghostId: string, passed: boolean): Promise<GhostCardRecord | null> {
    const ghost = await db.ghost_cards.get(ghostId);
    if (!ghost) return null;

    const now = new Date();

    if (passed) {
      if (ghost.stage >= 4) {
        // Conquered!
        ghost.stage = 4;
        ghost.conquered = true;
        ghost.conqueredAt = now.toISOString();
      } else {
        const nextStage = (ghost.stage + 1) as 1 | 2 | 3 | 4;
        ghost.stage = nextStage;
        const hours = GHOST_STAGE_INTERVALS_HOURS[nextStage];
        ghost.due = new Date(now.getTime() + hours * 3600 * 1000).toISOString();
      }
    } else {
      // Failed: reset to stage 1 micro-quarantine
      ghost.stage = 1;
      ghost.due = new Date(now.getTime() + GHOST_STAGE_INTERVALS_HOURS[1] * 3600 * 1000).toISOString();
    }

    await db.ghost_cards.put(ghost);
    return ghost;
  }

  /**
   * Fetches all active (unconquered) ghosts
   */
  static async getActiveGhosts(): Promise<GhostCardRecord[]> {
    return await db.ghost_cards.filter((g) => !g.conquered).toArray();
  }

  /**
   * Fetches ghosts that are currently due for review
   */
  static async getDueGhosts(asOf: Date = new Date()): Promise<GhostCardRecord[]> {
    const asOfIso = asOf.toISOString();
    const active = await this.getActiveGhosts();
    return active.filter((g) => g.due <= asOfIso);
  }

  /**
   * Fetches count of conquered ghosts
   */
  static async getConqueredCount(): Promise<number> {
    return await db.ghost_cards.filter((g) => g.conquered).count();
  }

  /**
   * Forcefully conquers (exorcises) a ghost card
   */
  static async exorciseGhost(ghostId: string): Promise<boolean> {
    const ghost = await db.ghost_cards.get(ghostId);
    if (!ghost) return false;

    ghost.conquered = true;
    ghost.conqueredAt = new Date().toISOString();
    await db.ghost_cards.put(ghost);
    return true;
  }

  /**
   * Deletes a ghost card record entirely
   */
  static async deleteGhost(ghostId: string): Promise<void> {
    await db.ghost_cards.delete(ghostId);
  }
}
