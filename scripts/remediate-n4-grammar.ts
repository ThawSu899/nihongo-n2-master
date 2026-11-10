import fs from 'fs';
import path from 'path';

const PACKS_DIR = path.join(process.cwd(), 'content', 'packs', 'n4');

export function remediateN4Grammar(): void {
  console.log('[Stage 2] Remediating Grammar Rule Precision, Distractor Fixes & Example Linking...');

  // 1. n4.l11: Remove 褒める from Group 1 rules (it is Group 2). Replace Group 1 example with 叱る -> 叱られる.
  const l11Path = path.join(PACKS_DIR, 'n4.l11.json');
  if (fs.existsSync(l11Path)) {
    const l11 = JSON.parse(fs.readFileSync(l11Path, 'utf8'));
    const g001 = l11.grammars?.find((g: any) => g.id === 'n4.l11.g001');
    if (g001 && g001.formation.includes('褒める -> 褒められる')) {
      g001.formation = g001.formation.replace(
        'Group 1: u -> a + れる (書く -> 書かれる, 褒める -> 褒められる)',
        'Group 1: u -> a + れる (書く -> 書かれる, 叱る -> 叱られる)'
      );
      fs.writeFileSync(l11Path, JSON.stringify(l11, null, 2) + '\n', 'utf8');
      console.log('  ✓ Fixed n4.l11.g001 Group 1 formation (removed 褒める)');
    }
  }

  // 2. n4.l03: g002.explanation.en translation for 使用禁止
  const l03Path = path.join(PACKS_DIR, 'n4.l03.json');
  if (fs.existsSync(l03Path)) {
    const l03 = JSON.parse(fs.readFileSync(l03Path, 'utf8'));
    const g002 = l03.grammars?.find((g: any) => g.id === 'n4.l03.g002');
    if (g002 && g002.explanation?.en?.includes('"Out of order"')) {
      g002.explanation.en = g002.explanation.en.replace('"Out of order"', '"Use prohibited / Do not use"');
      console.log('  ✓ Fixed n4.l03.g002.explanation.en translation for 使用禁止');
    }

    // Distractor fixes in n4.l03
    // q012: 食べる imperative: replace 食え with 食べらせ
    const q012 = l03.questions?.find((q: any) => q.id === 'n4.l03.q012');
    if (q012 && q012.choices.includes('食え')) {
      const idx = q012.choices.indexOf('食え');
      q012.choices[idx] = '食べらせ';
      console.log('  ✓ Fixed n4.l03.q012 distractor 食え -> 食べらせ');
    }

    // q013: する imperative: replace せよ with しれ to avoid dual correct answers
    const q013 = l03.questions?.find((q: any) => q.id === 'n4.l03.q013');
    if (q013 && q013.choices.includes('せよ')) {
      const idx = q013.choices.indexOf('せよ');
      q013.choices[idx] = 'しれ';
      if (q013.explanation) {
        q013.explanation = 'Group 3 verb する imperative is しろ.';
      }
      console.log('  ✓ Fixed n4.l03.q013 distractor せよ -> しれ');
    }

    // q014: 入る prohibitive: replace 入るなよ with 入るだ
    const q014 = l03.questions?.find((q: any) => q.id === 'n4.l03.q014');
    if (q014 && q014.choices.includes('入るなよ')) {
      const idx = q014.choices.indexOf('入るなよ');
      q014.choices[idx] = '入るだ';
      console.log('  ✓ Fixed n4.l03.q014 distractor 入るなよ -> 入るだ');
    }

    // Example linking in n4.l03
    const g001 = l03.grammars?.find((g: any) => g.id === 'n4.l03.g001');
    if (g001) {
      g001.examples = [
        { sentenceId: 'n4.l03.s008', note: 'Example 1 (逃げろ)' },
        { sentenceId: 'n4.l03.s010', note: 'Example 2 (止まれ)' }
      ];
    }
    if (g002) {
      g002.examples = [
        { sentenceId: 'n4.l03.s003', note: 'Example 1 (書いてあります)' },
        { sentenceId: 'n4.l03.s005', note: 'Example 2 (という意味です)' }
      ];
    }
    // Update sentence grammar links in l03
    if (l03.sentences) {
      l03.sentences.forEach((s: any) => {
        if (['n4.l03.s003', 'n4.l03.s005'].includes(s.id)) {
          s.grammarIds = ['n4.l03.g002'];
        } else if (['n4.l03.s008', 'n4.l03.s010'].includes(s.id)) {
          s.grammarIds = ['n4.l03.g001'];
        }
      });
    }

    fs.writeFileSync(l03Path, JSON.stringify(l03, null, 2) + '\n', 'utf8');
  }

  // 3. n4.l02: q012 distractor fix & example linking
  const l02Path = path.join(PACKS_DIR, 'n4.l02.json');
  if (fs.existsSync(l02Path)) {
    const l02 = JSON.parse(fs.readFileSync(l02Path, 'utf8'));
    const q012 = l02.questions?.find((q: any) => q.id === 'n4.l02.q012');
    if (q012 && q012.choices.includes('休まない')) {
      const idx = q012.choices.indexOf('休まない');
      q012.choices[idx] = '休まろ';
      console.log('  ✓ Fixed n4.l02.q012 ambiguous distractor 休まない -> 休まろ');
    }

    const g001 = l02.grammars?.find((g: any) => g.id === 'n4.l02.g001');
    const g002 = l02.grammars?.find((g: any) => g.id === 'n4.l02.g002');
    if (g001) {
      g001.examples = [
        { sentenceId: 'n4.l02.s002', note: 'Example 1 (立てようと思っています)' },
        { sentenceId: 'n4.l02.s004', note: 'Example 2 (案内しようと考えています)' }
      ];
    }
    if (g002) {
      g002.examples = [
        { sentenceId: 'n4.l02.s003', note: 'Example 1 (留学するつもりです)' },
        { sentenceId: 'n4.l02.s009', note: 'Example 2 (研究する予定です)' }
      ];
      console.log('  ✓ Relinked n4.l02.g002 examples to s003 and s009');
    }
    if (l02.sentences) {
      l02.sentences.forEach((s: any) => {
        if (['n4.l02.s003', 'n4.l02.s006', 'n4.l02.s007', 'n4.l02.s009', 'n4.l02.s010'].includes(s.id)) {
          s.grammarIds = ['n4.l02.g002'];
        } else {
          s.grammarIds = ['n4.l02.g001'];
        }
      });
    }

    fs.writeFileSync(l02Path, JSON.stringify(l02, null, 2) + '\n', 'utf8');
  }

  // 4. n4.l01: Relink g002 examples to s003 and s005
  const l01Path = path.join(PACKS_DIR, 'n4.l01.json');
  if (fs.existsSync(l01Path)) {
    const l01 = JSON.parse(fs.readFileSync(l01Path, 'utf8'));
    const g001 = l01.grammars?.find((g: any) => g.id === 'n4.l01.g001');
    const g002 = l01.grammars?.find((g: any) => g.id === 'n4.l01.g002');
    if (g001) {
      g001.examples = [
        { sentenceId: 'n4.l01.s001', note: 'Example 1 (直すことができます)' },
        { sentenceId: 'n4.l01.s002', note: 'Example 2 (使えますよ)' }
      ];
    }
    if (g002) {
      g002.examples = [
        { sentenceId: 'n4.l01.s003', note: 'Example 1 (声が聞こえます)' },
        { sentenceId: 'n4.l01.s005', note: 'Example 2 (景色がはっきり見えます)' }
      ];
      console.log('  ✓ Relinked n4.l01.g002 examples to s003 and s005');
    }
    if (l01.sentences) {
      l01.sentences.forEach((s: any) => {
        if (['n4.l01.s003', 'n4.l01.s004', 'n4.l01.s005', 'n4.l01.s006', 'n4.l01.s007'].includes(s.id)) {
          s.grammarIds = ['n4.l01.g002'];
        } else {
          s.grammarIds = ['n4.l01.g001'];
        }
      });
    }

    fs.writeFileSync(l01Path, JSON.stringify(l01, null, 2) + '\n', 'utf8');
  }

  // 5. Audit & update example links for L04-L10
  const L04_L10_EXAMPLES: Record<string, { g001: [string, string]; g002: [string, string]; g002Sentences: string[] }> = {
    'n4.l04': {
      g001: ['n4.l04.s004', 'n4.l04.s006'],
      g002: ['n4.l04.s001', 'n4.l04.s010'],
      g002Sentences: ['n4.l04.s001', 'n4.l04.s010']
    },
    'n4.l05': {
      g001: ['n4.l05.s001', 'n4.l05.s002'],
      g002: ['n4.l05.s003', 'n4.l05.s004'],
      g002Sentences: ['n4.l05.s003', 'n4.l05.s004']
    },
    'n4.l06': {
      g001: ['n4.l06.s001', 'n4.l06.s002'],
      g002: ['n4.l06.s003', 'n4.l06.s004'],
      g002Sentences: ['n4.l06.s003', 'n4.l06.s004', 'n4.l06.s005']
    },
    'n4.l07': {
      g001: ['n4.l07.s001', 'n4.l07.s002'],
      g002: ['n4.l07.s006', 'n4.l07.s007'],
      g002Sentences: ['n4.l07.s006', 'n4.l07.s007', 'n4.l07.s008']
    },
    'n4.l08': {
      g001: ['n4.l08.s001', 'n4.l08.s002'],
      g002: ['n4.l08.s003', 'n4.l08.s004'],
      g002Sentences: ['n4.l08.s003', 'n4.l08.s004', 'n4.l08.s005']
    },
    'n4.l09': {
      g001: ['n4.l09.s004', 'n4.l09.s005'],
      g002: ['n4.l09.s001', 'n4.l09.s002'],
      g002Sentences: ['n4.l09.s001', 'n4.l09.s002', 'n4.l09.s010']
    },
    'n4.l10': {
      g001: ['n4.l10.s002', 'n4.l10.s007'],
      g002: ['n4.l10.s003', 'n4.l10.s005'],
      g002Sentences: ['n4.l10.s001', 'n4.l10.s003', 'n4.l10.s004', 'n4.l10.s005', 'n4.l10.s006']
    }
  };

  for (const [packId, mapping] of Object.entries(L04_L10_EXAMPLES)) {
    const pPath = path.join(PACKS_DIR, `${packId}.json`);
    if (!fs.existsSync(pPath)) continue;
    const d = JSON.parse(fs.readFileSync(pPath, 'utf8'));

    const g001 = d.grammars?.find((g: any) => g.id === `${packId}.g001`);
    const g002 = d.grammars?.find((g: any) => g.id === `${packId}.g002`);

    if (g001) {
      g001.examples = [
        { sentenceId: mapping.g001[0], note: 'Example 1' },
        { sentenceId: mapping.g001[1], note: 'Example 2' }
      ];
    }
    if (g002) {
      g002.examples = [
        { sentenceId: mapping.g002[0], note: 'Example 1' },
        { sentenceId: mapping.g002[1], note: 'Example 2' }
      ];
    }
    if (d.sentences) {
      d.sentences.forEach((s: any) => {
        if (mapping.g002Sentences.includes(s.id)) {
          s.grammarIds = [`${packId}.g002`];
        } else {
          s.grammarIds = [`${packId}.g001`];
        }
      });
    }

    fs.writeFileSync(pPath, JSON.stringify(d, null, 2) + '\n', 'utf8');
    console.log(`  ✓ Relinked examples and sentences for ${packId}`);
  }

  console.log('[Stage 2] Completed successfully!\n');
}

remediateN4Grammar();
