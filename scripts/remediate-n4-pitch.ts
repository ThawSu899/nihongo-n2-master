import fs from 'fs';
import path from 'path';

const PACKS_DIR = path.join(process.cwd(), 'content', 'packs', 'n4');

export function remediateN4Pitch(): void {
  console.log('[Stage 5] Updating NHK Standard Pitch Accent Adjustments for L01-L03...');

  // n4.l01
  const l01Path = path.join(PACKS_DIR, 'n4.l01.json');
  if (fs.existsSync(l01Path)) {
    const l01 = JSON.parse(fs.readFileSync(l01Path, 'utf8'));
    const updates: Record<string, { dropIndex: number; pitchPattern: 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka' }> = {
      '直す': { dropIndex: 2, pitchPattern: 'nakadaka' },
      '直る': { dropIndex: 2, pitchPattern: 'nakadaka' },
      '声': { dropIndex: 1, pitchPattern: 'atamadaka' },
      '景色': { dropIndex: 1, pitchPattern: 'atamadaka' },
      '波': { dropIndex: 1, pitchPattern: 'atamadaka' },
      'はっきり': { dropIndex: 3, pitchPattern: 'nakadaka' },
      '道具': { dropIndex: 3, pitchPattern: 'odaka' },
    };

    l01.vocabularies?.forEach((v: any) => {
      if (updates[v.ja]) {
        v.dropIndex = updates[v.ja].dropIndex;
        v.pitchPattern = updates[v.ja].pitchPattern;
        console.log(`  ✓ n4.l01 ${v.id} ${v.ja} -> dropIndex: ${v.dropIndex}, pattern: ${v.pitchPattern}`);
      }
    });

    fs.writeFileSync(l01Path, JSON.stringify(l01, null, 2) + '\n', 'utf8');
  }

  // n4.l02
  const l02Path = path.join(PACKS_DIR, 'n4.l02.json');
  if (fs.existsSync(l02Path)) {
    const l02 = JSON.parse(fs.readFileSync(l02Path, 'utf8'));
    const updates: Record<string, { dropIndex: number; pitchPattern: 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka' }> = {
      '将来': { dropIndex: 1, pitchPattern: 'atamadaka' },
      '夢': { dropIndex: 2, pitchPattern: 'odaka' },
      '専門': { dropIndex: 1, pitchPattern: 'atamadaka' },
    };

    l02.vocabularies?.forEach((v: any) => {
      if (updates[v.ja]) {
        v.dropIndex = updates[v.ja].dropIndex;
        v.pitchPattern = updates[v.ja].pitchPattern;
        console.log(`  ✓ n4.l02 ${v.id} ${v.ja} -> dropIndex: ${v.dropIndex}, pattern: ${v.pitchPattern}`);
      }
    });

    fs.writeFileSync(l02Path, JSON.stringify(l02, null, 2) + '\n', 'utf8');
  }

  // n4.l03
  const l03Path = path.join(PACKS_DIR, 'n4.l03.json');
  if (fs.existsSync(l03Path)) {
    const l03 = JSON.parse(fs.readFileSync(l03Path, 'utf8'));
    const updates: Record<string, { dropIndex: number; pitchPattern: 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka' }> = {
      '守る': { dropIndex: 2, pitchPattern: 'nakadaka' },
      '意味': { dropIndex: 1, pitchPattern: 'atamadaka' },
      '注意': { dropIndex: 1, pitchPattern: 'atamadaka' },
      '投げる': { dropIndex: 2, pitchPattern: 'nakadaka' },
      '逃げる': { dropIndex: 2, pitchPattern: 'nakadaka' },
      '急ぐ': { dropIndex: 2, pitchPattern: 'nakadaka' },
    };

    l03.vocabularies?.forEach((v: any) => {
      if (updates[v.ja]) {
        v.dropIndex = updates[v.ja].dropIndex;
        v.pitchPattern = updates[v.ja].pitchPattern;
        console.log(`  ✓ n4.l03 ${v.id} ${v.ja} -> dropIndex: ${v.dropIndex}, pattern: ${v.pitchPattern}`);
      }
    });

    fs.writeFileSync(l03Path, JSON.stringify(l03, null, 2) + '\n', 'utf8');
  }

  console.log('[Stage 5] Completed successfully!\n');
}

remediateN4Pitch();
