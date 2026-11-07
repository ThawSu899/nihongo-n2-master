import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ShadowingPracticeScreen } from '../src/presentation/components/ShadowingPracticeScreen';
import { LessonPack, LessonPackSchema } from '../src/domain/models/types';

describe('Stage 10: Shadowing Practice & Burmese Dialogue Localization', () => {
  it('exports ShadowingPracticeScreen component', () => {
    expect(ShadowingPracticeScreen).toBeDefined();
    expect(typeof ShadowingPracticeScreen).toBe('function');
  });

  describe('Legacy N5 Dialogues Burmese Data Verification', () => {
    it('verifies n5.l03.json contains the authentic Burmese translations for Professor Tanaka dialogue turns', () => {
      const filePath = path.resolve(__dirname, '../content/packs/n5/n5.l03.json');
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const parsed = LessonPackSchema.parse(content);

      expect(parsed.listening.turns.length).toBe(4);

      // Turn 1
      const turn1 = parsed.listening.turns[0];
      expect(turn1.ja).toBe('すみません、田中先生の研究室はどちらですか。');
      expect(turn1.en).toBe("Excuse me, which way is Professor Tanaka's office?");
      expect(turn1.my).toBe('တစ်ဆိတ်လောက်ပါ၊ တာနာကာဆန်ဆေးရဲ့ ရုံးခန်းက ဘယ်ဘက်မှာလဲ ခင်ဗျာ။');
      expect(turn1.myanmar).toBe('တစ်ဆိတ်လောက်ပါ၊ တာနာကာဆန်ဆေးရဲ့ ရုံးခန်းက ဘယ်ဘက်မှာလဲ ခင်ဗျာ။');

      // Turn 2
      const turn2 = parsed.listening.turns[1];
      expect(turn2.ja).toBe('田中先生の研究室は四階の４０２号室です。エレベーターはあちらです。');
      expect(turn2.en).toBe("Professor Tanaka's office is room 402 on the 4th floor. The elevator is over that way.");
      expect(turn2.my).toBe('တာနာကာဆန်ဆေးရဲ့ ရုံးခန်းက ၄ လွှာ၊ အခန်း ၄၀၂ ပါ။ ဓာတ်လှေကားက ဟိုဘက်မှာပါ။');
      expect(turn2.myanmar).toBe('တာနာကာဆန်ဆေးရဲ့ ရုံးခန်းက ၄ လွှာ၊ အခန်း ၄၀၂ ပါ။ ဓာတ်လှေကားက ဟိုဘက်မှာပါ။');

      // Turn 3
      const turn3 = parsed.listening.turns[2];
      expect(turn3.ja).toBe('ありがとうございます。あと、トイレはどこですか。');
      expect(turn3.en).toBe('Thank you very much. Also, where is the restroom?');
      expect(turn3.my).toBe('ကျေးဇူးတင်ပါတယ်။ ဒါနဲ့၊ ရေအိမ်က ဘယ်နားမှာပါလဲ။');
      expect(turn3.myanmar).toBe('ကျေးဇူးတင်ပါတယ်။ ဒါနဲ့၊ ရေအိမ်က ဘယ်နားမှာပါလဲ။');

      // Turn 4
      const turn4 = parsed.listening.turns[3];
      expect(turn4.ja).toBe('トイレはエレベーターの右側にございます。');
      expect(turn4.en).toBe('The restroom is on the right side of the elevator.');
      expect(turn4.my).toBe('ရေအိမ်က ဓာတ်လှေကားရဲ့ ညာဘက်မှာ ရှိပါတယ်။');
      expect(turn4.myanmar).toBe('ရေအိမ်က ဓာတ်လှေကားရဲ့ ညာဘက်မှာ ရှိပါတယ်။');
    });

    it('verifies n5.l01.json contains Burmese dialogue translations', () => {
      const filePath = path.resolve(__dirname, '../content/packs/n5/n5.l01.json');
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const parsed = LessonPackSchema.parse(content);

      expect(parsed.listening.turns.length).toBeGreaterThanOrEqual(6);
      for (const turn of parsed.listening.turns) {
        expect(turn.my).toBeTruthy();
        expect(turn.myanmar).toBeTruthy();
      }
    });
  });
});
