import { ContentLoader } from '../../data/content/content-loader';
import {
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
  N2_BATCH5_PACKS,
  ALL_N2_PACKS,
} from './packs/n2';
import {
  N3_BATCH1_PACKS,
  N3_BATCH2_PACKS,
  ALL_N3_PACKS,
} from './packs/n3';
import { LessonPack } from '../models/types';

export {
  ContentLoader,
  N2_INITIAL_PACKS,
  N2_BATCH1_PACKS,
  N2_BATCH2_PACKS,
  N2_BATCH3_PACKS,
  N2_BATCH4_PACKS,
  N2_BATCH5_PACKS,
  ALL_N2_PACKS,
  N3_BATCH1_PACKS,
  N3_BATCH2_PACKS,
  ALL_N3_PACKS,
};

export function getN2InitialLessonPack(lessonId: string): LessonPack | undefined {
  return N2_INITIAL_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH1_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch2LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH2_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch3LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH3_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch4LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH4_PACKS.find((p) => p.id === lessonId);
}

export function getN2Batch5LessonPack(lessonId: string): LessonPack | undefined {
  return N2_BATCH5_PACKS.find((p) => p.id === lessonId);
}

export function getN2LessonPack(lessonId: string): LessonPack | undefined {
  return ALL_N2_PACKS.find((p) => p.id === lessonId);
}

export function getN3Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH1_PACKS.find((p) => p.id === lessonId);
}

export function getN3Batch2LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH2_PACKS.find((p) => p.id === lessonId);
}

export function getN3LessonPack(lessonId: string): LessonPack | undefined {
  return ALL_N3_PACKS.find((p) => p.id === lessonId);
}
