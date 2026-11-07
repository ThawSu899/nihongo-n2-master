import * as fs from 'fs';
import * as path from 'path';

const imports: string[] = [];
const exportsList: string[] = [];

for (let i = 1; i <= 60; i++) {
  const s = i.toString().padStart(2, '0');
  imports.push(`import { n2l${s}Data } from './n2.l${s}';`);
  exportsList.push(`  n2l${s}Data,`);
}

const initial = ['01', '02', '03'].map(s => `  n2l${s}Data,`).join('\n');
const b1 = ['04', '05', '06', '07', '08', '09', '10'].map(s => `  n2l${s}Data,`).join('\n');
const b2 = Array.from({ length: 10 }, (_, i) => (i + 11).toString().padStart(2, '0')).map(s => `  n2l${s}Data,`).join('\n');
const b3 = Array.from({ length: 10 }, (_, i) => (i + 21).toString().padStart(2, '0')).map(s => `  n2l${s}Data,`).join('\n');
const b4 = Array.from({ length: 10 }, (_, i) => (i + 31).toString().padStart(2, '0')).map(s => `  n2l${s}Data,`).join('\n');
const b5 = Array.from({ length: 20 }, (_, i) => (i + 41).toString().padStart(2, '0')).map(s => `  n2l${s}Data,`).join('\n');

const content = `import { LessonPack } from '../../../models/types';
${imports.join('\n')}

export {
${exportsList.join('\n')}
};

export const N2_INITIAL_PACKS: LessonPack[] = [
${initial}
];

export const N2_BATCH1_PACKS: LessonPack[] = [
${b1}
];

export const N2_BATCH2_PACKS: LessonPack[] = [
${b2}
];

export const N2_BATCH3_PACKS: LessonPack[] = [
${b3}
];

export const N2_BATCH4_PACKS: LessonPack[] = [
${b4}
];

export const N2_BATCH5_PACKS: LessonPack[] = [
${b5}
];

export const ALL_N2_PACKS: LessonPack[] = [
  ...N2_INITIAL_PACKS,
  ...N2_BATCH1_PACKS,
  ...N2_BATCH2_PACKS,
  ...N2_BATCH3_PACKS,
  ...N2_BATCH4_PACKS,
  ...N2_BATCH5_PACKS,
];
`;

fs.writeFileSync(path.resolve('./src/domain/curriculum/packs/n2/index.ts'), content, 'utf-8');
console.log('Fixed packs/n2/index.ts');
