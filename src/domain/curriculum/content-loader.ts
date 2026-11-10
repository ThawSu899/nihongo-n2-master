import { ContentLoader } from '../../data/content/content-loader';
import { LessonPack } from '../models/types';

// Load all N2 and N3 lesson packs directly from canonical JSON content packs
const n2PackModules = import.meta.glob<LessonPack>('/content/packs/n2/*.json', { eager: true });
const n3PackModules = import.meta.glob<LessonPack>('/content/packs/n3/*.json', { eager: true });

function extractPack(mod: any): LessonPack {
  return (mod.default || mod) as LessonPack;
}

const n2PacksMap = new Map<string, LessonPack>();
for (const [, mod] of Object.entries(n2PackModules)) {
  const pack = extractPack(mod);
  n2PacksMap.set(pack.id, pack);
}

const n3PacksMap = new Map<string, LessonPack>();
for (const [, mod] of Object.entries(n3PackModules)) {
  const pack = extractPack(mod);
  n3PacksMap.set(pack.id, pack);
}

function getN2Range(start: number, end: number): LessonPack[] {
  const list: LessonPack[] = [];
  for (let i = start; i <= end; i++) {
    const id = `n2.l${i.toString().padStart(2, '0')}`;
    const p = n2PacksMap.get(id);
    if (p) list.push(p);
  }
  return list;
}

function getN3Range(start: number, end: number): LessonPack[] {
  const list: LessonPack[] = [];
  for (let i = start; i <= end; i++) {
    const id = `n3.l${i.toString().padStart(2, '0')}`;
    const p = n3PacksMap.get(id);
    if (p) list.push(p);
  }
  return list;
}

export const N2_INITIAL_PACKS: LessonPack[] = getN2Range(1, 3);
export const N2_BATCH1_PACKS: LessonPack[] = getN2Range(4, 10);
export const N2_BATCH2_PACKS: LessonPack[] = getN2Range(11, 20);
export const N2_BATCH3_PACKS: LessonPack[] = getN2Range(21, 30);
export const N2_BATCH4_PACKS: LessonPack[] = getN2Range(31, 40);
export const N2_BATCH5_PACKS: LessonPack[] = getN2Range(41, 60);
export const ALL_N2_PACKS: LessonPack[] = getN2Range(1, 60);

export const N3_BATCH1_PACKS: LessonPack[] = getN3Range(1, 30);
export const N3_BATCH2_PACKS: LessonPack[] = getN3Range(31, 48);
export const ALL_N3_PACKS: LessonPack[] = getN3Range(1, 48);

export {
  ContentLoader,
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
  return n2PacksMap.get(lessonId);
}

export function getN3Batch1LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH1_PACKS.find((p) => p.id === lessonId);
}

export function getN3Batch2LessonPack(lessonId: string): LessonPack | undefined {
  return N3_BATCH2_PACKS.find((p) => p.id === lessonId);
}

export function getN3LessonPack(lessonId: string): LessonPack | undefined {
  return n3PacksMap.get(lessonId);
}
