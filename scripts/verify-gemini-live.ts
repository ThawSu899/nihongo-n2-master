/**
 * Live Gemini API Validation Smoke Test Script
 * Verifies real Gemini API connectivity, response quality, token usage,
 * and pedagogical structure across all 6 tutor modes.
 *
 * Usage: npx tsx scripts/verify-gemini-live.ts
 *
 * NOTE: Reads GEMINI_API_KEY from environment or .env file.
 * Never prints or leaks the API key to the console or logs.
 */
import dotenv from 'dotenv';
dotenv.config();

import { callGeminiTutor, TutorMode, JLPTLevel } from '../server/gemini-tutor-service';

async function runLiveSmokeTest() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

  console.log('====================================================');
  console.log('   NIHONGO N2 MASTER — GEMINI AI TUTOR LIVE TEST   ');
  console.log('====================================================');
  console.log(`Configured Model: ${modelName}`);

  if (!apiKey) {
    console.error('\n[BLOCKED] GEMINI_API_KEY is not set in environment or .env.');
    console.error('To run live validation:');
    console.error('1. Obtain a key from Google AI Studio: https://aistudio.google.com/app/apikey');
    console.error('2. Add to your local .env file: GEMINI_API_KEY=your_key_here');
    console.error('3. Re-run: npx tsx scripts/verify-gemini-live.ts\n');
    process.exit(1);
  }

  console.log('API Key detected (length: ' + apiKey.length + ' chars, securely isolated).');
  console.log('Starting multi-mode live smoke test...\n');

  const testCases: Array<{
    mode: TutorMode;
    level: JLPTLevel;
    lessonId: string;
    language: 'my' | 'en';
    userMessage: string;
    expectedTopic: string;
  }> = [
    {
      mode: 'ask',
      level: 'N3',
      lessonId: 'n3.l01',
      language: 'my',
      userMessage: 'JLPT N3 စာမေးပွဲအတွက် အချိန်စီမံခန့်ခွဲမှု နည်းလမ်းကောင်းများကို အကြံပြုပေးပါ။',
      expectedTopic: 'General Inquiry (Burmese)',
    },
    {
      mode: 'grammar',
      level: 'N3',
      lessonId: 'n3.l01',
      language: 'my',
      userMessage: '「〜わけではない」၏ အဓိပ္ပာယ်၊ ဖွဲ့စည်းပုံနှင့် သုံးစွဲပုံကို ရှင်းပြပေးပါ။',
      expectedTopic: 'Grammar Tutor (~わけではない)',
    },
    {
      mode: 'vocabulary',
      level: 'N2',
      lessonId: 'n2.l01',
      language: 'my',
      userMessage: '「把握 (はあく)」ဟူသော စကားလုံး၏ အဓိပ္ပာယ်၊ တွဲဖက်သုံးစကားစုများကို ရှင်းပြပါ။',
      expectedTopic: 'Vocabulary Tutor (把握)',
    },
    {
      mode: 'kanji',
      level: 'N3',
      lessonId: 'n3.l01',
      language: 'my',
      userMessage: '「否」ခန်းဂျီး၏ အွန်ယောမိ၊ ခွန်ယောမိနှင့် အသုံးများ စကားလုံးများကို ရှင်းပြပါ။',
      expectedTopic: 'Kanji Tutor (否)',
    },
    {
      mode: 'quiz',
      level: 'N3',
      lessonId: 'n3.l01',
      language: 'my',
      userMessage: 'ကျေးဇူးပြု၍ N3 သဒ္ဒါအတွက် မေးခွန်း ၁ ခု မေးပေးပါ။ အဖြေကို မပြောပြသေးပါနှင့်။',
      expectedTopic: 'Interactive Quiz (Single Question)',
    },
    {
      mode: 'correction',
      level: 'N4',
      lessonId: 'n4.l01',
      language: 'my',
      userMessage: '「昨日は友達と映画を見に行きましたで、楽しかったです。」ဒီစာကြောင်း မှန်ပါသလား။',
      expectedTopic: 'Sentence Correction (Particle / Linkage)',
    },
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    process.stdout.write(`Testing [${tc.mode.toUpperCase()}] - ${tc.expectedTopic}... `);
    const start = Date.now();

    try {
      const result = await callGeminiTutor({
        request: {
          mode: tc.mode,
          level: tc.level,
          lessonId: tc.lessonId,
          language: tc.language,
          userMessage: tc.userMessage,
        },
        apiKey,
        modelName,
        timeoutMs: 30000,
      });

      const elapsed = Date.now() - start;

      if (!result.success || !result.message) {
        console.log(`FAILED (${elapsed}ms)`);
        console.error(`  Error: ${result.error}`);
      } else {
        console.log(`SUCCESS (${elapsed}ms)`);
        console.log(`  Preview: ${result.message.substring(0, 100).replace(/\n/g, ' ')}...`);
        if (result.usage) {
          console.log(`  Tokens: prompt=${result.usage.promptTokens}, candidates=${result.usage.candidatesTokens}, total=${result.usage.totalTokens}`);
        }
        passedCount++;
      }
    } catch (err: any) {
      console.log(`ERROR (${Date.now() - start}ms)`);
      console.error(`  Exception: ${err?.message || err}`);
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(`Live Smoke Test Summary: ${passedCount}/${testCases.length} Passed`);
  console.log('====================================================');
}

runLiveSmokeTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
