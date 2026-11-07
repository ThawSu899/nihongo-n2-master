import { db } from '../db/dexie-db';
import { SRSCard } from '../../domain/models/types';
import { getOrDecomposeKanji } from '../../domain/dictionary/kanji-catalog';

export type AnkiExportScope = 'all' | 'mined' | 'leeches';

export interface AnkiExportOptions {
  scope: AnkiExportScope;
}

export interface AnkiExportResult {
  content: string;
  filename: string;
  count: number;
}

/**
 * Anki Deck Export Engine
 * Generates UTF-8 tab-separated values (.tsv) with standard Anki configuration directives.
 *
 * Supported Fields:
 * 1. Front (Expression / Kanji / Grammar Pattern)
 * 2. Reading (Kana / Furigana / Onyomi & Kunyomi)
 * 3. Meaning EN (English Definition)
 * 4. Meaning Myanmar (Burmese Definition)
 * 5. POS/Formation (Part of Speech / Grammatical Connection / Facet)
 * 6. Example Sentence (Japanese context passage)
 * 7. Sentence Translation (English / Burmese translation of example sentence)
 * 8. Tags (Space-separated Anki tags)
 */
export class AnkiExporter {
  /**
   * Sanitizes a string for TSV export by replacing unescaped tabs and formatting newlines into <br>
   */
  static sanitizeField(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/\t/g, ' ')
      .replace(/\r?\n/g, '<br>')
      .trim();
  }

  /**
   * Queries cards matching the specified scope
   */
  static async getCardsByScope(scope: AnkiExportScope): Promise<SRSCard[]> {
    const allCards = await db.srs_cards.toArray();

    switch (scope) {
      case 'mined':
        return allCards.filter(
          (c) =>
            c.id.startsWith('quick_') ||
            c.lessonId.includes('quick') ||
            c.lessonId.includes('mined') ||
            c.itemId.startsWith('item_mined') ||
            c.lessonId === 'n2.quick_search'
        );
      case 'leeches':
        return allCards.filter((c) => c.isLeech || (c.lapses && c.lapses >= 3));
      case 'all':
      default:
        return allCards;
    }
  }

  /**
   * Formats a card into the 8-column TSV row matching Anki specifications
   */
  static formatCardRow(card: SRSCard): string {
    const front = this.sanitizeField(card.prompt);
    let reading = this.sanitizeField(card.reading || '');
    const meaningEn = this.sanitizeField(card.meaning);
    let meaningMyanmar = '';
    let posFormation = this.sanitizeField(card.facet || card.itemType);
    let exampleSentence = '';
    let sentenceTranslation = '';

    // Decompose or enrich Kanji information
    if (card.itemType === 'kanji') {
      const kanjiDetail = getOrDecomposeKanji(card.prompt);
      if (kanjiDetail) {
        if (!reading && kanjiDetail.onyomi?.length) {
          reading = this.sanitizeField(
            `音: ${kanjiDetail.onyomi.join('、')} / 訓: ${kanjiDetail.kunyomi.join('、')}`
          );
        }
        if (kanjiDetail.meaningMy) {
          meaningMyanmar = this.sanitizeField(kanjiDetail.meaningMy);
        }
        if (kanjiDetail.radical) {
          posFormation = this.sanitizeField(
            `部首: ${kanjiDetail.radical} (${kanjiDetail.radicalMeaning || ''}) · Strokes: ${kanjiDetail.strokes || '—'}`
          );
        }
      }
    } else if (card.itemType === 'grammar') {
      posFormation = this.sanitizeField(`N2 Grammar · ${card.facet || 'Pattern'}`);
    } else if (card.itemType === 'vocab') {
      posFormation = this.sanitizeField(`Vocabulary · ${card.facet || 'Lexeme'}`);
    }

    // Process example sentence and translation
    if (card.exampleSentence) {
      const raw = card.exampleSentence;
      // If the example sentence contains a translation separated by newline or parenthesis
      if (raw.includes('\n')) {
        const parts = raw.split(/\r?\n/);
        exampleSentence = this.sanitizeField(parts[0]);
        sentenceTranslation = this.sanitizeField(parts.slice(1).join(' '));
      } else {
        exampleSentence = this.sanitizeField(raw);
      }
    }

    // Build Anki tag list (space-separated)
    const tagList: string[] = [
      'JLPT_N2',
      'NihongoN2Master',
      `type_${card.itemType}`,
    ];

    if (card.lessonId) {
      tagList.push(`lesson_${card.lessonId.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    }
    if (card.isLeech || (card.lapses && card.lapses >= 3)) {
      tagList.push('leech_quarantined');
    }
    if (card.intervalDays && card.intervalDays >= 21) {
      tagList.push('mature_interval');
    }
    if (
      card.id.startsWith('quick_') ||
      card.lessonId.includes('quick') ||
      card.lessonId.includes('mined')
    ) {
      tagList.push('user_mined');
    }

    const tags = tagList.join(' ');

    return [
      front,
      reading,
      meaningEn,
      meaningMyanmar,
      posFormation,
      exampleSentence,
      sentenceTranslation,
      tags,
    ].join('\t');
  }

  /**
   * Generates formatted TSV content with standard Anki header directives
   */
  static generateTsvContent(cards: SRSCard[]): string {
    const headers = [
      '#separator:tab',
      '#html:true',
      '#tags column:8',
      '#columns:Front\tReading\tMeaning EN\tMeaning Myanmar\tPOS/Formation\tExample Sentence\tSentence Translation\tTags',
    ];

    const rows = cards.map((c) => this.formatCardRow(c));
    return [...headers, ...rows].join('\n');
  }

  /**
   * Exports cards to an Anki-compatible TSV string with metadata
   */
  static async exportToAnki(options: AnkiExportOptions = { scope: 'all' }): Promise<AnkiExportResult> {
    const cards = await this.getCardsByScope(options.scope);
    const content = this.generateTsvContent(cards);
    const dateStr = new Date().toISOString().substring(0, 10);
    const filename = `nihongo-n2-anki-${options.scope}-${dateStr}.tsv`;

    return {
      content,
      filename,
      count: cards.length,
    };
  }

  /**
   * Triggers browser download of exported Anki TSV file
   */
  static async downloadAnkiExport(options: AnkiExportOptions = { scope: 'all' }): Promise<AnkiExportResult> {
    const result = await this.exportToAnki(options);

    if (typeof document !== 'undefined') {
      const blob = new Blob([result.content], { type: 'text/tab-separated-values;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return result;
  }
}
