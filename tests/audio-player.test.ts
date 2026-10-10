import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveSpeakerAcoustics,
  cleanJapanesePrompt,
  parseDialogueTranscript,
} from '../src/presentation/hooks/useAudioPlayer';

describe('useAudioPlayer - Speaker Acoustics & Pitch Variation', () => {
  it('correctly maps Tanaka-sensei to deeper pitch and teacher cadence', () => {
    const acoustics = resolveSpeakerAcoustics('たなか先生');
    expect(acoustics.pitch).toBeLessThan(1.0);
    expect(acoustics.pitch).toBe(0.88);
    expect(acoustics.genderPreference).toBe('male');
  });

  it('correctly maps Ken to higher pitch learner acoustics', () => {
    const acoustics = resolveSpeakerAcoustics('ケン');
    expect(acoustics.pitch).toBeGreaterThan(1.0);
    expect(acoustics.pitch).toBe(1.12);
    expect(acoustics.genderPreference).toBe('male');
  });

  it('correctly handles English variations of Ken and Tanaka-sensei', () => {
    const ken = resolveSpeakerAcoustics('Ken');
    const tanaka = resolveSpeakerAcoustics('Tanaka-sensei');
    expect(ken.pitch).toBe(1.12);
    expect(tanaka.pitch).toBe(0.88);
  });

  it('differentiates dialogue Turn A (female preference) and Turn B (male preference)', () => {
    const turnA = resolveSpeakerAcoustics('A');
    const turnB = resolveSpeakerAcoustics('B');
    expect(turnA.pitch).toBeGreaterThan(1.0);
    expect(turnA.genderPreference).toBe('female');
    expect(turnB.pitch).toBeLessThan(1.0);
    expect(turnB.genderPreference).toBe('male');
  });

  it('identifies female characters and assigns higher pitch with female gender preference', () => {
    const kyoko = resolveSpeakerAcoustics('Kyoko');
    const karina = resolveSpeakerAcoustics('カリナ');
    const lisa = resolveSpeakerAcoustics('リサ');
    expect(kyoko.pitch).toBe(1.18);
    expect(kyoko.genderPreference).toBe('female');
    expect(karina.pitch).toBe(1.18);
    expect(karina.genderPreference).toBe('female');
    expect(lisa.pitch).toBe(1.18);
  });

  it('returns default neutral acoustics when speaker is undefined or unknown generic name', () => {
    const empty = resolveSpeakerAcoustics();
    expect(empty.pitch).toBe(1.0);
    expect(empty.rateMultiplier).toBe(1.0);
    expect(empty.genderPreference).toBe('neutral');

    const unknown = resolveSpeakerAcoustics('SomeRandomSpeaker');
    expect(unknown.pitch).toBe(1.0);
    expect(unknown.genderPreference).toBe('neutral');
  });
});

describe('useAudioPlayer - Text Parsing & Japanese Extraction', () => {
  it('extracts pure Japanese text enclosed in Japanese quotation brackets 「...」', () => {
    const extracted = cleanJapanesePrompt('What does 「おはようございます」 mean?');
    expect(extracted).toBe('おはようございます');
  });

  it('extracts pure Japanese text enclosed in Japanese double quotation brackets 『...』', () => {
    const extracted = cleanJapanesePrompt('How should 『本』 be pronounced?');
    expect(extracted).toBe('本');
  });

  it('extracts spoken text when dialogue speaker prefix is present', () => {
    const full = 'ケン：せんせい、おはようございます。';
    const extracted = cleanJapanesePrompt(full);
    expect(extracted).toBe('せんせい、おはようございます。');
  });

  it('extracts Japanese text enclosed in western quotation marks', () => {
    const quoted = 'Ken says "こんにちは" to the class';
    const extracted = cleanJapanesePrompt(quoted);
    expect(extracted).toBe('こんにちは');
  });

  it('leaves clean Japanese sentences unchanged', () => {
    const sent = 'わたしはがくせいです。';
    expect(cleanJapanesePrompt(sent)).toBe(sent);
  });

  it('parses full dialogue transcripts into speaker turns with correct separation', () => {
    const transcript = [
      'ケン：せんせい、おはようございます。',
      'たなか先生：おはようございます、ケンさん。',
      'ケン：すみません、たなかさんはにほんじんですか。',
    ].join('\n');

    const turns = parseDialogueTranscript(transcript);
    expect(turns).toHaveLength(3);
    expect(turns[0]).toEqual({
      speaker: 'ケン',
      text: 'せんせい、おはようございます。',
    });
    expect(turns[1]).toEqual({
      speaker: 'たなか先生',
      text: 'おはようございます、ケンさん。',
    });
    expect(turns[2]).toEqual({
      speaker: 'ケン',
      text: 'すみません、たなかさんはにほんじんですか。',
    });
  });
});
