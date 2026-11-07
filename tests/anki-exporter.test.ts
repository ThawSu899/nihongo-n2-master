import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/data/db/dexie-db';
import { AnkiExporter } from '../src/data/backup/anki-exporter';
import { SRSCard } from '../src/domain/models/types';

describe('AnkiExporter Pipeline', () => {
  beforeEach(async () => {
    await db.srs_cards.clear();

    const sampleCards: SRSCard[] = [
      {
        id: 'card_std_1',
        itemId: 'item_kanji_1',
        lessonId: 'n2.l01',
        itemType: 'kanji',
        facet: 'meaning',
        prompt: '握',
        reading: 'アク、にぎ.る',
        meaning: 'grip, hold, mould sushi',
        state: 'review',
        intervalDays: 14,
        repetition: 3,
        stability: 12.0,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      },
      {
        id: 'quick_mined_vocab_1',
        itemId: 'item_mined_1',
        lessonId: 'n2.quick_search',
        itemType: 'vocab',
        facet: 'reading',
        prompt: '握手',
        reading: 'あくしゅ',
        meaning: 'handshake',
        exampleSentence: '大統領と握手を交わした。\nExchanged a handshake with the president.',
        state: 'review',
        intervalDays: 5,
        repetition: 2,
        stability: 4.0,
        difficulty: 4,
        lapses: 4,
        isLeech: true,
        due: new Date().toISOString(),
      },
      {
        id: 'card_grammar_1',
        itemId: 'item_grammar_1',
        lessonId: 'n2.l02',
        itemType: 'grammar',
        facet: 'meaning',
        prompt: '〜に際して',
        reading: 'にさいして',
        meaning: 'on the occasion of, when doing',
        exampleSentence: '出発に際して注意を受ける。',
        state: 'new',
        intervalDays: 0,
        repetition: 0,
        stability: 1.0,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      },
    ];

    await db.srs_cards.bulkAdd(sampleCards);
  });

  it('generates standard Anki directives and 8-column header in TSV output', async () => {
    const result = await AnkiExporter.exportToAnki({ scope: 'all' });
    expect(result.count).toBe(3);

    const lines = result.content.split('\n');
    expect(lines[0]).toBe('#separator:tab');
    expect(lines[1]).toBe('#html:true');
    expect(lines[2]).toBe('#tags column:8');
    expect(lines[3]).toBe(
      '#columns:Front\tReading\tMeaning EN\tMeaning Myanmar\tPOS/Formation\tExample Sentence\tSentence Translation\tTags'
    );
  });

  it('filters by Mined Cards Only scope correctly', async () => {
    const result = await AnkiExporter.exportToAnki({ scope: 'mined' });
    expect(result.count).toBe(1);

    const lines = result.content.split('\n');
    const dataRow = lines[4].split('\t');
    expect(dataRow[0]).toBe('握手');
    expect(dataRow[1]).toBe('あくしゅ');
    expect(dataRow[2]).toBe('handshake');
    expect(dataRow[5]).toBe('大統領と握手を交わした。');
    expect(dataRow[6]).toBe('Exchanged a handshake with the president.');
    expect(dataRow[7]).toContain('user_mined');
  });

  it('filters by Quarantined Leeches Only scope correctly', async () => {
    const result = await AnkiExporter.exportToAnki({ scope: 'leeches' });
    expect(result.count).toBe(1);

    const lines = result.content.split('\n');
    const dataRow = lines[4].split('\t');
    expect(dataRow[0]).toBe('握手');
    expect(dataRow[7]).toContain('leech_quarantined');
  });

  it('sanitizes unescaped tabs and converts newlines into <br>', () => {
    const card: SRSCard = {
      id: 'test_card',
      itemId: 'test_item',
      lessonId: 'n2.l05',
      itemType: 'vocab',
      facet: 'meaning',
      prompt: 'Word\tTabbed',
      reading: 'よみ',
      meaning: 'Line 1\nLine 2',
      exampleSentence: 'Japanese Sentence\r\nEnglish Sentence Translation',
      state: 'new',
      intervalDays: 1,
      repetition: 0,
      stability: 1,
      difficulty: 3,
      lapses: 0,
      isLeech: false,
      due: new Date().toISOString(),
    };

    const row = AnkiExporter.formatCardRow(card);
    const cols = row.split('\t');
    expect(cols.length).toBe(8);
    expect(cols[0]).toBe('Word Tabbed'); // tab replaced with space
    expect(cols[2]).toBe('Line 1<br>Line 2'); // newline in meaning replaced with <br>
    expect(cols[5]).toBe('Japanese Sentence'); // sentence extracted
    expect(cols[6]).toBe('English Sentence Translation'); // translation extracted
  });
});
