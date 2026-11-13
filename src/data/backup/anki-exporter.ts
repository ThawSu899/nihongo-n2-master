import { db } from '../db/dexie-db';
import { SRSCard } from '../../domain/models/types';
import { getOrDecomposeKanji } from '../../domain/dictionary/kanji-catalog';

export type AnkiExportScope =
  | 'all'
  | 'mined'
  | 'leeches'
  | 'weak_items'
  | 'n5'
  | 'n4'
  | 'n3'
  | 'n2';

export interface AnkiExportOptions {
  scope: AnkiExportScope;
  format?: '8col' | '5col';
}

export interface AnkiExportResult {
  content: string;
  filename: string;
  count: number;
}

/**
 * Anki Deck Export Engine
 * Generates clean UTF-8 tab-separated values (.tsv) with standard Anki configuration directives.
 *
 * Supported Fields (5-Column Standard):
 * 1. Japanese_Kanji
 * 2. Reading_Furigana
 * 3. Burmese_Meaning
 * 4. Example_Sentence
 * 5. JLPT_Level_Tag
 *
 * Also supports classic 8-column structured layout for backward compatibility.
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
        return allCards.filter((c) => c.isLeech || (c.lapses !== undefined && c.lapses >= 3));
      case 'weak_items':
        return allCards.filter(
          (c) =>
            c.isLeech ||
            (c.lapses !== undefined && c.lapses >= 2) ||
            (c.easeFactor !== undefined && c.easeFactor <= 1.6)
        );
      case 'n5':
      case 'n4':
      case 'n3':
      case 'n2':
        return allCards.filter(
          (c) =>
            c.lessonId.toLowerCase().includes(scope) ||
            c.id.toLowerCase().includes(scope)
        );
      case 'all':
      default:
        return allCards;
    }
  }

  /**
   * Formats a card into the 5-column TSV row:
   * Japanese_Kanji, Reading_Furigana, Burmese_Meaning, Example_Sentence, JLPT_Level_Tag
   */
  static formatStandard5ColRow(card: SRSCard): string {
    const japaneseKanji = this.sanitizeField(card.prompt);
    let readingFurigana = this.sanitizeField(card.reading || '');
    let burmeseMeaning = '';
    let exampleSentence = '';

    if (card.meaningMyanmar || card.meaningMy) {
      burmeseMeaning = this.sanitizeField(card.meaningMyanmar || card.meaningMy);
    } else if (card.itemType === 'kanji') {
      const kanjiDetail = getOrDecomposeKanji(card.prompt);
      if (kanjiDetail) {
        if (!readingFurigana && kanjiDetail.onyomi?.length) {
          readingFurigana = this.sanitizeField(
            `音: ${kanjiDetail.onyomi.join('、')} / 訓: ${kanjiDetail.kunyomi.join('、')}`
          );
        }
        if (kanjiDetail.meaningMy) {
          burmeseMeaning = this.sanitizeField(kanjiDetail.meaningMy);
        }
      }
    }

    if (!burmeseMeaning) {
      burmeseMeaning = this.sanitizeField(card.meaning);
    }

    if (card.exampleSentence) {
      const raw = card.exampleSentence;
      if (raw.includes('\n')) {
        const parts = raw.split(/\r?\n/);
        exampleSentence = this.sanitizeField(parts[0]);
      } else {
        exampleSentence = this.sanitizeField(raw);
      }
    }

    // Determine level tag
    let levelTag = 'JLPT_N2';
    if (card.lessonId) {
      const lMatch = card.lessonId.match(/n[1-5]/i);
      if (lMatch) {
        levelTag = `JLPT_${lMatch[0].toUpperCase()}`;
      }
    }
    if (card.isLeech || (card.lapses && card.lapses >= 2) || (card.easeFactor && card.easeFactor <= 1.6)) {
      levelTag += ' Leech_WeakItem';
    }

    return [
      japaneseKanji,
      readingFurigana,
      burmeseMeaning,
      exampleSentence,
      levelTag,
    ].join('\t');
  }

  /**
   * Generates standard 5-column TSV content with directives
   */
  static generateStandard5ColTsv(cards: SRSCard[]): string {
    const headers = [
      '#separator:tab',
      '#html:true',
      '#tags column:5',
      '#columns:Japanese_Kanji\tReading_Furigana\tBurmese_Meaning\tExample_Sentence\tJLPT_Level_Tag',
    ];

    const rows = cards.map((c) => this.formatStandard5ColRow(c));
    return [...headers, ...rows].join('\n');
  }

  /**
   * Exports cards to standard 5-column TSV format
   */
  static async exportStandard5ColTsv(
    options: AnkiExportOptions = { scope: 'all' }
  ): Promise<AnkiExportResult> {
    const cards = await this.getCardsByScope(options.scope);
    const content = this.generateStandard5ColTsv(cards);
    const dateStr = new Date().toISOString().substring(0, 10);
    const filename = `nihongo-anki-${options.scope}-${dateStr}.tsv`;

    return {
      content,
      filename,
      count: cards.length,
    };
  }

  /**
   * Triggers browser download of standard 5-column Anki TSV file
   */
  static async downloadStandard5ColTsv(
    options: AnkiExportOptions = { scope: 'all' }
  ): Promise<AnkiExportResult> {
    const result = await this.exportStandard5ColTsv(options);

    if (typeof document !== 'undefined') {
      const blob = new Blob([result.content], {
        type: 'text/tab-separated-values;charset=utf-8',
      });
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

  /**
   * Formats a card into the 8-column TSV row matching Anki specifications (Classic)
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
            `音: ${kanjiDetail.onyomi.join('、')} / 训: ${kanjiDetail.kunyomi.join('、')}`
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
      if (raw.includes('\n')) {
        const parts = raw.split(/\r?\n/);
        exampleSentence = this.sanitizeField(parts[0]);
        sentenceTranslation = this.sanitizeField(parts.slice(1).join(' '));
      } else {
        exampleSentence = this.sanitizeField(raw);
      }
    }

    // Build Anki tag list (space-separated)
    const tagList: string[] = ['JLPT_N2', 'NihongoN2Master', `type_${card.itemType}`];

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
   * Generates formatted TSV content with standard Anki header directives (Classic 8-column)
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
  static async exportToAnki(
    options: AnkiExportOptions = { scope: 'all' }
  ): Promise<AnkiExportResult> {
    if (options.format === '5col') {
      return this.exportStandard5ColTsv(options);
    }
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
  static async downloadAnkiExport(
    options: AnkiExportOptions = { scope: 'all' }
  ): Promise<AnkiExportResult> {
    if (options.format === '5col') {
      return this.downloadStandard5ColTsv(options);
    }
    const result = await this.exportToAnki(options);

    if (typeof document !== 'undefined') {
      const blob = new Blob([result.content], {
        type: 'text/tab-separated-values;charset=utf-8',
      });
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
