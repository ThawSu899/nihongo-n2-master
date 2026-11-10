import { PitchPattern } from '../../src/domain/audio/pitch-accent';
import { Vocabulary } from '../../src/domain/models/types';

export interface LexiconWord {
  ja: string;
  kana: string;
  en: string;
  my: string;
  pos: Vocabulary['pos'];
  pitchPattern: PitchPattern;
  dropIndex: number;
}
