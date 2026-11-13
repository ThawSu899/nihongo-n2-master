import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AnkiExporter } from '../src/data/backup/anki-exporter';
import {
  PWAInstallGuideCard,
  LIVE_APP_URL,
} from '../src/presentation/components/PWAInstallGuideCard';
import { SRSCard } from '../src/domain/models/types';

describe('ADVANCED FEATURE 9/10: Anki 5-Col TSV Exporter & PWA Install Hub', () => {
  describe('Anki 5-Col TSV Exporter', () => {
    it('formats card into exactly 5 columns (Japanese_Kanji, Reading_Furigana, Burmese_Meaning, Example_Sentence, JLPT_Level_Tag)', () => {
      const card: SRSCard = {
        id: 'srs_test_1',
        facet: 'reading',
        lessonId: 'n2_lesson_01',
        itemId: 'vocab_01',
        itemType: 'vocab',
        prompt: '契約',
        reading: 'けいやく',
        meaning: 'Contract / Agreement (စာချုပ်)',
        exampleSentence: '会社と新しい契約を結んだ。\nI signed a new contract with the company.',
        state: 'review',
        intervalDays: 5,
        repetition: 2,
        stability: 2.5,
        difficulty: 3,
        lapses: 0,
        isLeech: false,
        due: new Date().toISOString(),
      };

      const row = AnkiExporter.formatStandard5ColRow(card);
      const cols = row.split('\t');

      expect(cols).toHaveLength(5);
      expect(cols[0]).toBe('契約'); // Japanese_Kanji
      expect(cols[1]).toBe('けいやく'); // Reading_Furigana
      expect(cols[2]).toBe('Contract / Agreement (စာချုပ်)'); // Burmese_Meaning
      expect(cols[3]).toBe('会社と新しい契約を結んだ。'); // Example_Sentence
      expect(cols[4]).toContain('JLPT_N2'); // JLPT_Level_Tag
    });

    it('appends Leech_WeakItem tag to high-lapse cards', () => {
      const weakCard: SRSCard = {
        id: 'srs_test_weak',
        facet: 'meaning',
        lessonId: 'n2_lesson_04',
        itemId: 'vocab_04',
        itemType: 'vocab',
        prompt: '妥協',
        reading: 'だきょう',
        meaning: 'Compromise',
        state: 'relearning',
        intervalDays: 1,
        repetition: 4,
        stability: 1.2,
        difficulty: 4.5,
        lapses: 3,
        isLeech: true,
        due: new Date().toISOString(),
      };

      const row = AnkiExporter.formatStandard5ColRow(weakCard);
      const cols = row.split('\t');

      expect(cols).toHaveLength(5);
      expect(cols[0]).toBe('妥協');
      expect(cols[4]).toContain('Leech_WeakItem');
    });

    it('generates standard 5-col header directives', () => {
      const cards: SRSCard[] = [
        {
          id: 'card_1',
          facet: 'reading',
          lessonId: 'n5_lesson_01',
          itemId: 'vocab_1',
          itemType: 'vocab',
          prompt: '本',
          reading: 'ほん',
          meaning: 'စာအုပ် (Book)',
          state: 'new',
          intervalDays: 1,
          repetition: 0,
          stability: 1,
          difficulty: 3,
          lapses: 0,
          isLeech: false,
          due: new Date().toISOString(),
        },
      ];

      const tsv = AnkiExporter.generateStandard5ColTsv(cards);
      expect(tsv).toContain('#separator:tab');
      expect(tsv).toContain('#tags column:5');
      expect(tsv).toContain('#columns:Japanese_Kanji\tReading_Furigana\tBurmese_Meaning\tExample_Sentence\tJLPT_Level_Tag');
      expect(tsv).toContain('本\tほん\tစာအုပ် (Book)\t\tJLPT_N5');
    });
  });

  describe('PWAInstallGuideCard Component', () => {
    it('renders live app link and copy button', () => {
      const html = renderToString(React.createElement(PWAInstallGuideCard, {}));

      expect(html).toContain(LIVE_APP_URL);
      expect(html).toContain('Copy Live App Link');
      expect(html).toContain('PWA Setup Guide');
    });

    it('renders platform guides with Burmese instructions', () => {
      const html = renderToString(React.createElement(PWAInstallGuideCard, {}));

      expect(html).toContain('Android (Chrome)');
      expect(html).toContain('iPhone / iPad (Safari)');
      expect(html).toContain('Windows / Mac (PC)');
      expect(html).toContain('Google Chrome');
      expect(html).toContain('Add to Home screen');
    });
  });
});
