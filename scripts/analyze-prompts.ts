import fs from 'fs';
import path from 'path';

const packsDir = path.resolve('content/packs');
const patterns = new Map<string, number>();

for (const lvl of ['n5', 'n4', 'n3', 'n2']) {
  const dir = path.join(packsDir, lvl);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const pack = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    for (const q of (pack.questions || [])) {
      const p = q.prompt
        .replace(/「[^」]+」/g, '「...」')
        .replace(/"[^"]+"/g, '"..."');
      patterns.set(p, (patterns.get(p) || 0) + 1);
    }
  }
}

const sorted = Array.from(patterns.entries()).sort((a,b) => b[1] - a[1]);
console.log('Top 25 prompt patterns:');
for (const [pat, count] of sorted.slice(0, 25)) {
  console.log(`[${count}] ${pat}`);
}
