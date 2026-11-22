import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import 'fake-indexeddb/auto';
import {
  AITutorRequestSchema,
  assembleSystemInstruction,
  callGeminiTutor,
  handleAITutorRequest,
  checkRateLimit,
  AITutorRequest,
  CompactLessonContext,
} from '../server/gemini-tutor-service';
import {
  askAITutor,
  buildCompactLessonContext,
} from '../src/services/ai-tutor-client';
import { AITutorScreen } from '../src/presentation/screens/AITutorScreen';
import { db } from '../src/data/db/dexie-db';
import { ContentLoader } from '../src/data/content/content-loader';
import { BackupManager } from '../src/data/backup/backup-manager';
import { LessonPack, UserProfile } from '../src/domain/models/types';

// Mock @google/genai module
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    apiKey: string;
    models: any;
    constructor(config: { apiKey: string }) {
      this.apiKey = config.apiKey;
      this.models = {
        generateContent: vi.fn().mockImplementation(async (params: any) => {
          const lastContent = params.contents?.[params.contents.length - 1];
          const text = lastContent?.parts?.[0]?.text || '';
          if (text.includes('TRIGGER_429')) {
            throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for model');
          }
          if (text.includes('TRIGGER_EMPTY')) {
            return { text: '' };
          }
          return {
            text: '「〜わけではない」は部分否定を表します。(It does not necessarily mean...)',
            usageMetadata: {
              promptTokenCount: 120,
              candidatesTokenCount: 85,
              totalTokenCount: 205,
            },
          };
        }),
      };
    }
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
  };
});

describe('Gemini AI Japanese Tutor V1 Test Suite', () => {
  const originalEnv = process.env;
  const originalNavigator = global.navigator;

  const mockProfile: UserProfile = {
    name: 'Test Learner',
    level: 'N3',
    currentLessonId: 'n3.l01',
    dailyTargetMinutes: 120,
    dailyReviewCap: 100,
    dailyNewCap: 30,
    studyStreakDays: 5,
    dayRolloverHour: 4,
    showRomaji: false,
    furiganaMode: 'unlearned',
    explanationLang: 'my',
    targetRetention: 0.9,
    notificationSettings: {
      inApp: true,
      browser: false,
      calendarPopup: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
  };

  const sampleLessonPack: LessonPack = {
    id: 'n3.l01',
    level: 'N3',
    module: 'grammar',
    number: 1,
    title: 'N3 Lesson 1: ~わけではない (Partial Negation)',
    description: 'Learn how to express partial negation in natural Japanese.',
    status: 'published',
    masteryThresholds: {
      vocab: 0.9,
      kanji: 0.85,
      grammar: 0.85,
      reading: 0.8,
      listening: 0.8,
      overall: 0.85,
    },
    grammars: [
      {
        id: 'g1',
        lessonId: 'n3.l01',
        pattern: '〜わけではない',
        meaning: 'It does not mean that; not necessarily',
        meaningMy: 'ဒီလိုမျိုးချည်းတော့ မဟုတ်ပါဘူး (တစ်စိတ်တစ်ပိုင်း ငြင်းပယ်ခြင်း)',
        formation: 'Verb/Adj/Noun plain form + わけではない',
        explanation: { en: 'Expresses partial negation', my: 'တစ်စိတ်တစ်ပိုင်း ငြင်းပယ်ခြင်း' },
        examples: [],
        similarGrammarIds: [],
        commonMistakes: [],
        difficulty: 3,
        level: 'N3',
        prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
      },
    ],
    vocabularies: [
      {
        id: 'v1',
        lessonId: 'n3.l01',
        ja: '否定',
        kana: 'ひてい',
        en: 'negation; denial',
        my: 'ငြင်းပယ်ခြင်း',
        pos: 'noun',
        kanjiIds: ['k1'],
        level: 'N3',
        difficulty: 3,
        importance: 4,
        audio: { kind: 'tts', lang: 'ja-JP' },
        prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
      },
    ],
    kanjis: [
      {
        id: 'k1',
        lessonId: 'n3.l01',
        char: '否',
        meaning: 'negate; no',
        onyomi: ['ヒ'],
        kunyomi: ['いな'],
        exampleVocab: [],
        exampleSentenceIds: [],
        components: ['口'],
        difficulty: 3,
        level: 'N3',
        prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
      },
    ],
    sentences: [
      {
        id: 's1',
        lessonId: 'n3.l01',
        ja: '嫌いなわけではないが、あまり食べない。',
        kana: 'きらいなわけではないが、あまりたべない。',
        translation: {
          en: 'It is not that I dislike it, but I do not eat it often.',
          my: 'မကြိုက်တာမျိုးတော့ မဟုတ်ပေမယ့် သိပ်မစားဖြစ်ဘူး။',
        },
        vocabIds: ['v1'],
        grammarIds: ['g1'],
        audio: { kind: 'tts', lang: 'ja-JP' },
        prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
      },
    ],
    reading: {
      id: 'r1',
      lessonId: 'n3.l01',
      title: 'Reading',
      level: 'N3',
      text: 'Sample',
      kanaText: 'Sample',
      translation: 'Sample',
      questionIds: [],
      difficulty: 3,
      glossary: [],
      prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
    },
    listening: {
      id: 'l1',
      lessonId: 'n3.l01',
      title: 'Listening',
      level: 'N3',
      audio: { kind: 'tts', lang: 'ja-JP' },
      speakers: ['Speaker A'],
      transcript: 'Transcript',
      translation: 'Translation',
      turns: [],
      questionIds: [],
      difficulty: 3,
      prov: { source: 'editor', license: 'MIT', status: 'reviewed', updatedAt: '2026-11-20', rev: 1 },
    },
    questions: [],
    prov: {
      source: 'editorial',
      license: 'MIT',
      status: 'reviewed',
      updatedAt: '2026-11-20',
      rev: 1,
      authoringOrigin: 'human-authored',
      verificationStatus: 'native-speaker-verified',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'test-api-key-12345',
      GEMINI_MODEL: 'gemini-3.8-flash',
    };
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, onLine: true },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  // ============================================================================
  // 1. Zod Request Validation & Payload Constraints
  // ============================================================================
  describe('1. Zod Request Validation & Payload Constraints', () => {
    it('accepts valid requests across all 6 tutor modes', () => {
      const modes = ['ask', 'grammar', 'vocabulary', 'kanji', 'quiz', 'correction'] as const;
      modes.forEach((mode) => {
        const payload = {
          mode,
          level: 'N2',
          lessonId: 'n2.l01',
          language: 'my',
          userMessage: 'Please explain this concept.',
        };
        const parsed = AITutorRequestSchema.safeParse(payload);
        expect(parsed.success).toBe(true);
      });
    });

    it('rejects empty or whitespace-only user messages', () => {
      const emptyPayload = {
        mode: 'ask',
        level: 'N3',
        userMessage: '   ',
      };
      const parsed = AITutorRequestSchema.safeParse(emptyPayload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('rejects user messages exceeding maximum 1,000 characters', () => {
      const longPayload = {
        mode: 'grammar',
        level: 'N2',
        userMessage: 'あ'.repeat(1001),
      };
      const parsed = AITutorRequestSchema.safeParse(longPayload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('maximum 1,000 characters');
      }
    });

    it('rejects invalid or unsupported JLPT levels', () => {
      const invalidLevelPayload = {
        mode: 'ask',
        level: 'N1', // Project supports N5-N2
        userMessage: 'Test message',
      };
      const parsed = AITutorRequestSchema.safeParse(invalidLevelPayload);
      expect(parsed.success).toBe(false);
    });

    it('limits conversation history to at most 10 messages', () => {
      const excessiveHistory = Array.from({ length: 15 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
        content: `Message ${i}`,
      }));
      const payload = {
        mode: 'quiz',
        level: 'N3',
        userMessage: 'Next question',
        conversationHistory: excessiveHistory,
      };
      const parsed = AITutorRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
    });

    it('automatically drops empty or whitespace-only conversation history entries', () => {
      const payload = {
        mode: 'ask',
        level: 'N4',
        userMessage: 'Help me',
        conversationHistory: [
          { role: 'user', content: '' },
          { role: 'model', content: '   ' },
          { role: 'user', content: 'Previous message' },
        ],
      };
      const parsed = AITutorRequestSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.conversationHistory?.length).toBe(1);
        expect(parsed.data.conversationHistory?.[0].content).toBe('Previous message');
      }
    });
  });

  // ============================================================================
  // 2. System Instruction Assembly & Pedagogical Rules
  // ============================================================================
  describe('2. System Instruction Assembly & Prompt Grounding', () => {
    it('assembles teacher persona, JLPT level, and Burmese language instructions by default', () => {
      const instruction = assembleSystemInstruction('grammar', 'N3', 'my');
      expect(instruction).toContain('experienced, patient, and pedagogically rigorous Japanese language teacher');
      expect(instruction).toContain('Target JLPT level: N3');
      expect(instruction).toContain('Burmese (မြန်မာဘာသာ)');
      expect(instruction).toContain('MODE: GRAMMAR TUTOR');
      expect(instruction).toContain('Teach instead of merely giving answers');
      expect(instruction).toContain('CONCISENESS & BREVITY DIRECTIVE');
      expect(instruction).toContain('untrusted data');
    });

    it('assembles English explanation language directives when selected', () => {
      const instruction = assembleSystemInstruction('vocabulary', 'N2', 'en');
      expect(instruction).toContain('PRIMARY EXPLANATION LANGUAGE: English');
      expect(instruction).toContain('MODE: VOCABULARY TUTOR');
    });

    it('grounds system instruction in compact curriculum lesson context when provided', () => {
      const context: CompactLessonContext = {
        lessonId: 'n3.l01',
        level: 'N3',
        title: 'N3 Lesson 1: ~わけではない',
        description: 'Partial negation overview',
        grammars: [{ title: '〜わけではない', meaning: 'not necessarily', formation: 'plain form' }],
        vocabularies: [{ ja: '否定', kana: 'ひてい', en: 'negation', my: 'ငြင်းပယ်ခြင်း' }],
        kanjis: [{ char: '否', meaning: 'negate', onyomi: ['ヒ'], kunyomi: ['いな'] }],
        sentences: [{ ja: '嫌いなわけではない', en: 'Not that I dislike it', my: 'မကြိုက်တာမျိုး မဟုတ်ပါ' }],
      };

      const instruction = assembleSystemInstruction('quiz', 'N3', 'my', context);
      expect(instruction).toContain('CURRENT CURRICULUM CONTEXT');
      expect(instruction).toContain('Lesson ID: n3.l01 (N3)');
      expect(instruction).toContain('N3 Lesson 1: ~わけではない');
      expect(instruction).toContain('Official Lesson Grammar Points:');
      expect(instruction).toContain('〜わけではない: not necessarily');
      expect(instruction).toContain('Official Lesson Vocabulary:');
      expect(instruction).toContain('否定 [ひてい]: ငြင်းပယ်ခြင်း');
      expect(instruction).toContain('CURRICULUM PRIORITIZATION');
    });

    it('contains specific instructions for Quiz and Correction modes', () => {
      const quizInstruction = assembleSystemInstruction('quiz', 'N4', 'my');
      expect(quizInstruction).toContain('Present EXACTLY ONE targeted question at a time');
      expect(quizInstruction).toContain('Do NOT reveal the correct answer until the learner submits an answer');
      expect(quizInstruction).toContain('If the learner asks for a HINT');

      const correctionInstruction = assembleSystemInstruction('correction', 'N5', 'my');
      expect(correctionInstruction).toContain('SENTENCE CORRECTION');
      expect(correctionInstruction).toContain('particle accuracy (助詞)');
    });
  });

  // ============================================================================
  // 3. Gemini Service Execution & Error Handling
  // ============================================================================
  describe('3. Gemini Service Execution & Error Resilience', () => {
    it('returns error when GEMINI_API_KEY is not configured', async () => {
      const request: AITutorRequest = {
        mode: 'ask',
        level: 'N3',
        language: 'my',
        userMessage: 'How to use 〜わけではない?',
      };

      const result = await callGeminiTutor({ request, apiKey: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gemini API key is not configured');
    });

    it('successfully calls mocked Gemini and returns message with token usage', async () => {
      const request: AITutorRequest = {
        mode: 'grammar',
        level: 'N3',
        lessonId: 'n3.l01',
        language: 'my',
        userMessage: 'Explain 〜わけではない',
      };

      const result = await callGeminiTutor({ request, apiKey: 'mock_key' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('〜わけではない');
      expect(result.model).toBe('gemini-3.8-flash');
      expect(result.usage?.promptTokens).toBe(120);
      expect(result.usage?.totalTokens).toBe(205);
    });

    it('gracefully handles 429 rate limit / quota exceeded errors', async () => {
      const request: AITutorRequest = {
        mode: 'ask',
        level: 'N2',
        language: 'my',
        userMessage: 'TRIGGER_429 test',
      };

      const result = await callGeminiTutor({ request, apiKey: 'mock_key' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit or quota reached');
    });

    it('gracefully handles empty model responses', async () => {
      const request: AITutorRequest = {
        mode: 'ask',
        level: 'N2',
        language: 'my',
        userMessage: 'TRIGGER_EMPTY test',
      };

      const result = await callGeminiTutor({ request, apiKey: 'mock_key' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Received an empty response from Gemini');
    });
  });

  // ============================================================================
  // 4. Rate Limiting & HTTP Handler (Express & Vercel)
  // ============================================================================
  describe('4. Rate Limiting & HTTP Handler (Express + Vercel)', () => {
    it('tracks per-client rate limit and blocks bursts exceeding 30 requests/minute', () => {
      const testClientId = `test_client_${Date.now()}`;
      for (let i = 0; i < 30; i++) {
        expect(checkRateLimit(testClientId).allowed).toBe(true);
      }
      const blocked = checkRateLimit(testClientId);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    });

    it('handleAITutorRequest enforces POST method check and returns 405 on GET', async () => {
      const mockReq = { method: 'GET', body: {} };
      let statusCode = 0;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseBody = data;
        },
        setHeader: vi.fn(),
      };

      await handleAITutorRequest(mockReq, mockRes);
      expect(statusCode).toBe(405);
      expect(responseBody?.error).toContain('Method Not Allowed');
    });

    it('handleAITutorRequest returns 400 on invalid payload', async () => {
      const mockReq = { method: 'POST', body: { mode: 'invalid_mode', userMessage: '' } };
      let statusCode = 0;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseBody = data;
        },
        setHeader: vi.fn(),
      };

      await handleAITutorRequest(mockReq, mockRes);
      expect(statusCode).toBe(400);
      expect(responseBody?.error).toContain('Invalid request payload');
    });

    it('handleAITutorRequest executes callGeminiTutor and returns 200 on valid POST', async () => {
      const mockReq = {
        method: 'POST',
        body: {
          mode: 'ask',
          level: 'N3',
          language: 'my',
          userMessage: 'Hello AI 先生',
        },
      };
      let statusCode = 0;
      let responseBody: any = null;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          responseBody = data;
        },
        setHeader: vi.fn(),
      };

      await handleAITutorRequest(mockReq, mockRes);
      expect(statusCode).toBe(200);
      expect(responseBody?.success).toBe(true);
      expect(responseBody?.message).toBeDefined();
    });
  });

  // ============================================================================
  // 5. Client Service & Offline Resilience
  // ============================================================================
  describe('5. Client Service & Offline Resilience', () => {
    it('buildCompactLessonContext extracts key lesson data within safe token bounds', () => {
      const compact = buildCompactLessonContext(sampleLessonPack);
      expect(compact).toBeDefined();
      expect(compact!.lessonId).toBe('n3.l01');
      expect(compact!.level).toBe('N3');
      expect(compact!.grammars?.[0]?.title).toBe('〜わけではない');
      expect(compact!.vocabularies?.[0]?.ja).toBe('否定');
      expect(compact!.kanjis?.[0]?.char).toBe('否');
      expect(compact!.sentences?.[0]?.ja).toContain('嫌いなわけではない');
    });

    it('askAITutor throws immediately when offline without calling fetch', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { ...originalNavigator, onLine: false },
        configurable: true,
        writable: true,
      });

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const request: AITutorRequest = {
        mode: 'ask',
        level: 'N3',
        language: 'my',
        userMessage: 'Offline query',
      };

      await expect(askAITutor(request)).rejects.toThrow(/You appear to be offline/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('askAITutor calls POST /api/ai-tutor and parses JSON response when online', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Client response from Gemini',
          model: 'gemini-3.8-flash',
        }),
      });
      global.fetch = mockFetch;

      const request: AITutorRequest = {
        mode: 'grammar',
        level: 'N3',
        language: 'my',
        userMessage: 'Test client call',
      };

      const result = await askAITutor(request);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Client response from Gemini');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai-tutor',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });
  });

  // ============================================================================
  // 6. UI Rendering & AI Notes Persistence
  // ============================================================================
  describe('6. UI Rendering & AI Notes Persistence', () => {
    it('renders AITutorScreen with all 6 mode tabs and level switcher', () => {
      const html = renderToString(
        React.createElement(AITutorScreen, {
          profile: mockProfile,
          initialLessonId: 'n3.l01',
        })
      );

      expect(html).toContain('AI Japanese Tutor');
      expect(html).toContain('AI 先生');
      expect(html).toContain('Gemini 3.8 Flash');
      expect(html).toContain('Ask AI');
      expect(html).toContain('Grammar Tutor');
      expect(html).toContain('Vocabulary Tutor');
      expect(html).toContain('Kanji Tutor');
      expect(html).toContain('Interactive Quiz');
      expect(html).toContain('Sentence Correction');
    });

    it('persists AI explanation to existing Dexie ai_notes table with provenance "ai" and status "ai_draft"', async () => {
      const noteId = `ai_note_test_${Date.now()}`;
      const noteRecord = {
        id: noteId,
        topic: 'GRAMMAR - n3.l01',
        prompt: 'Explain 〜わけではない',
        response: '「〜わけではない」は部分否定を表します。',
        provenance: 'ai' as const,
        status: 'ai_draft' as const,
        createdAt: new Date().toISOString(),
      };

      await db.ai_notes.put(noteRecord);

      const retrieved = await db.ai_notes.get(noteId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.provenance).toBe('ai');
      expect(retrieved?.status).toBe('ai_draft');
      expect(retrieved?.topic).toContain('n3.l01');
      expect(retrieved?.response).toContain('〜わけではない');
    });
  });

  // ============================================================================
  // 7. Existing System Regression Checks
  // ============================================================================
  describe('7. Existing System Regression Checks', () => {
    it('preserves all 174 published curriculum lessons in ContentLoader', () => {
      const map = ContentLoader.getCurriculumMap();
      expect(map.length).toBe(174);

      const n5 = map.filter((l) => l.level === 'N5');
      const n4 = map.filter((l) => l.level === 'N4');
      const n3 = map.filter((l) => l.level === 'N3');
      const n2 = map.filter((l) => l.level === 'N2');

      expect(n5.length).toBe(30);
      expect(n4.length).toBe(36);
      expect(n3.length).toBe(48);
      expect(n2.length).toBe(60);
    });

    it('preserves existing BackupManager export functionality without corruption', async () => {
      const json = await BackupManager.exportToJson();
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.version).toBeDefined();
    });

    it('preserves SRS card database tables and structure', async () => {
      const cardCount = await db.srs_cards.count();
      expect(typeof cardCount).toBe('number');
    });
  });
});
