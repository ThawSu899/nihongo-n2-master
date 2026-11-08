import { PitchPattern } from '../audio/pitch-accent';

export type GhostCardReason =
  | 'HIGH_LAPSE_COUNT'
  | 'LOW_STABILITY_PLATEAU'
  | 'MOCK_TEST_REPEATED_MISS'
  | 'BURMESE_MISALIGNMENT';

export interface QuarantinedCard {
  id: string;
  itemType: 'vocabulary' | 'grammar';
  wordOrPattern: string;
  reading?: string;
  meaningBurmese: string;
  meaningEn: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2';
  quarantineReason: GhostCardReason;
  quarantinedAt: number;
  lapses: number;
  currentStability: number;
  currentDifficulty: number;
  recoveryStreak: number; // target: 3 consecutive correct recalls to graduate
  isGraduated: boolean;
  pitchPattern?: PitchPattern;
  dropIndex?: number;
}

export interface QuarantineStats {
  totalQuarantined: number;
  activeCount: number;
  graduatedCount: number;
  byLevel: Record<'N5' | 'N4' | 'N3' | 'N2', number>;
  byReason: Record<GhostCardReason, number>;
}
