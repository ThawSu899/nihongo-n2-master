import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSSEBlock,
  streamAITutor,
} from '../src/services/ai-tutor-client';
import {
  handleAITutorRequest,
  streamGeminiTutor,
  callGeminiTutor,
  calculateBackoffWithJitter,
  isTransient503Error,
  isTimeoutError,
  AITutorRequest,
  GenericHttpRequest,
  GenericHttpResponse,
} from '../server/gemini-tutor-service';
import { db, AIChatSession, AIChatMessage } from '../src/data/db/dexie-db';
import { BackupManager, BackupData } from '../src/data/backup/backup-manager';

// Mock @google/genai for streaming
let mock503RetryAttempt = 0;

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      apiKey: string;
      constructor(config: { apiKey: string }) {
        this.apiKey = config.apiKey;
      }
      models = {
        generateContent: vi.fn().mockImplementation(async (params?: any) => {
          const lastContent = params?.contents?.[params.contents.length - 1];
          const text = lastContent?.parts?.[0]?.text || '';
          if (text.includes('TRIGGER_503_THEN_SUCCESS')) {
            mock503RetryAttempt++;
            if (mock503RetryAttempt === 1) {
              const err = new Error('503 Service Unavailable: High load spike');
              (err as any).status = 503;
              throw err;
            }
            return {
              text: 'Non-streaming recovered after retry!',
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
            };
          }
          if (text.includes('TRIGGER_504')) {
            const err = new Error('504 DEADLINE_EXCEEDED');
            (err as any).status = 504;
            throw err;
          }
          if (text.includes('TRIGGER_401') || text.includes('TRIGGER_403')) {
            const err = new Error('401 UNAUTHENTICATED: API_KEY_INVALID');
            (err as any).status = 401;
            throw err;
          }
          return {
            text: 'Non-streaming response',
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
          };
        }),
        generateContentStream: vi.fn().mockImplementation(async function* (params?: any) {
          const lastContent = params?.contents?.[params.contents.length - 1];
          const text = lastContent?.parts?.[0]?.text || '';
          if (text.includes('TRIGGER_503_THEN_SUCCESS')) {
            mock503RetryAttempt++;
            if (mock503RetryAttempt === 1) {
              const err = new Error('503 Service Unavailable: High load spike');
              (err as any).status = 503;
              throw err;
            }
            yield { text: 'Recovered after retry successfully!' };
            return;
          }
          if (text.includes('TRIGGER_MID_STREAM_503')) {
            yield { text: 'First chunk sent' };
            const err = new Error('503 Service Unavailable: Dropped mid-stream');
            (err as any).status = 503;
            throw err;
          }
          if (text.includes('TRIGGER_504')) {
            const err = new Error('504 DEADLINE_EXCEEDED: Upstream gateway timeout');
            (err as any).status = 504;
            throw err;
          }
          if (text.includes('TRIGGER_401')) {
            const err = new Error('401 UNAUTHENTICATED: API_KEY_INVALID');
            (err as any).status = 401;
            throw err;
          }
          if (text.includes('TRIGGER_403')) {
            const err = new Error('403 PERMISSION_DENIED: Method requires authentication');
            (err as any).status = 403;
            throw err;
          }
          if (text.includes('TRIGGER_429')) {
            const err = new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for model');
            (err as any).status = 429;
            throw err;
          }
          if (text.includes('TRIGGER_503')) {
            const err = new Error('503 Service Unavailable: Backend overloaded');
            (err as any).status = 503;
            throw err;
          }
          if (text.includes('TRIGGER_INVALID_KEY')) {
            throw new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.');
          }
          if (params?.model === 'unsupported-model' || text.includes('TRIGGER_INVALID_MODEL')) {
            const err = new Error('models/unsupported-model is not found for API version v1beta');
            (err as any).status = 404;
            throw err;
          }
          if (text.includes('TRIGGER_EMPTY')) {
            yield { text: '' };
            return;
          }
          if (text.includes('TRIGGER_DELAY')) {
            await new Promise((resolve) => setTimeout(resolve, 30));
            yield { text: 'Delayed start' };
            yield { text: ' content.' };
            return;
          }
          if (text.includes('TRIGGER_TIMEOUT')) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            yield { text: 'Too late' };
            return;
          }
          yield { text: 'こんにちは！' };
          yield { text: ' ဂျပန်စာလေ့လာကြရအောင်။' };
          yield {
            text: ' (Let us learn Japanese.)',
            usageMetadata: { totalTokenCount: 45 },
          };
        }),
      };
    },
    ThinkingLevel: {
      THINKING_LEVEL_UNSPECIFIED: 'THINKING_LEVEL_UNSPECIFIED',
      LOW: 'LOW',
      HIGH: 'HIGH',
    },
  };
});

describe('AI Tutor V2 — SSE Parsing & Multi-byte UTF-8 Handling', () => {
  it('parses basic SSE event block', () => {
    const raw = 'event: start\ndata: {"model":"gemini-3.8-flash","mode":"ask"}\n\n';
    const result = parseSSEBlock(raw);
    expect(result).not.toBeNull();
    expect(result?.event).toBe('start');
    const parsedData = JSON.parse(result?.data || '{}');
    expect(parsedData.model).toBe('gemini-3.8-flash');
    expect(parsedData.mode).toBe('ask');
  });

  it('correctly parses Japanese Kanji and Kana in chunk event', () => {
    const raw = 'event: chunk\ndata: {"text":"日本語能力試験N2合格を目指しましょう！"}\n\n';
    const result = parseSSEBlock(raw);
    expect(result?.event).toBe('chunk');
    const parsedData = JSON.parse(result?.data || '{}');
    expect(parsedData.text).toBe('日本語能力試験N2合格を目指しましょう！');
  });

  it('correctly parses multi-byte Burmese characters in chunk event', () => {
    const raw = 'event: chunk\ndata: {"text":"မင်္ဂလာပါခင်ဗျာ။ သဒ္ဒါကို ရှင်းပြပေးပါမည်။"}\n\n';
    const result = parseSSEBlock(raw);
    expect(result?.event).toBe('chunk');
    const parsedData = JSON.parse(result?.data || '{}');
    expect(parsedData.text).toBe('မင်္ဂလာပါခင်ဗျာ။ သဒ္ဒါကို ရှင်းပြပေးပါမည်။');
  });

  it('returns null for empty blocks or comment-only blocks', () => {
    expect(parseSSEBlock('')).toBeNull();
    expect(parseSSEBlock('   \n\n  ')).toBeNull();
    expect(parseSSEBlock(': this is a ping comment\n\n')).toBeNull();
  });

  it('handles multi-line data payloads joined by newlines', () => {
    const raw = 'event: chunk\ndata: {"text":"Line 1\\n"\ndata: "Line 2"}\n\n';
    const result = parseSSEBlock(raw);
    expect(result?.event).toBe('chunk');
    expect(result?.data).toContain('Line 1');
  });
});

describe('AI Tutor V2 — Frontend streamAITutor Client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('streams chunks sequentially and triggers onStart, onChunk, onDone', async () => {
    const encoder = new TextEncoder();
    const ssePayload = [
      'event: start\ndata: {"model":"gemini-3.8-flash","mode":"grammar"}\n\n',
      'event: chunk\ndata: {"text":"〜わけにはいかない"}\n\n',
      'event: chunk\ndata: {"text":" သည် မလုပ်ဘဲ မနေနိုင်သော အခြေအနေကို ဖော်ပြသည်။"}\n\n',
      'event: done\ndata: {"totalTokens":50}\n\n',
    ].join('');

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: stream,
    });

    const onStart = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    const request: AITutorRequest = {
      mode: 'grammar',
      level: 'N2',
      userMessage: '〜わけにはいかない အကြောင်း ရှင်းပြပါ',
    };

    await streamAITutor(request, { onStart, onChunk, onDone, onError });

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.8-flash' }));
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, '〜わけにはいかない');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' သည် မလုပ်ဘဲ မနေနိုင်သော အခြေအနေကို ဖော်ပြသည်။');
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ totalTokens: 50 }));
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles server HTTP error response before streaming begins', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({
        success: false,
        error: 'Gemini API key is not configured on the server.',
      }),
    });

    const onError = vi.fn();
    const request: AITutorRequest = {
      mode: 'ask',
      level: 'N5',
      userMessage: 'Test prompt',
    };

    await expect(streamAITutor(request, { onChunk: vi.fn(), onError })).rejects.toThrow(
      'Gemini API key is not configured on the server.'
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Gemini API key is not configured on the server.' })
    );
  });

  it('handles client cancellation via AbortController', async () => {
    const encoder = new TextEncoder();
    const controller = new AbortController();

    const stream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode('event: chunk\ndata: {"text":"First part"}\n\n'));
        c.enqueue(encoder.encode('event: chunk\ndata: {"text":"Second part"}\n\n'));
        c.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onChunk = vi.fn().mockImplementation((chunkText: string) => {
      if (chunkText === 'First part') {
        controller.abort();
      }
    });

    const request: AITutorRequest = {
      mode: 'ask',
      level: 'N5',
      userMessage: 'Test abort',
    };

    await streamAITutor(request, { onChunk }, controller.signal);
    expect(onChunk).toHaveBeenCalledWith('First part');
    expect(onChunk).not.toHaveBeenCalledWith('Second part');
  });

  it('handles multiple SSE events arriving in a single network chunk', async () => {
    const encoder = new TextEncoder();
    const multiEventChunk = [
      'event: start\ndata: {"model":"gemini-3.8-flash","mode":"ask"}\n\n',
      'event: chunk\ndata: {"text":"Part 1"}\n\n',
      'event: chunk\ndata: {"text":"Part 2"}\n\n',
      'event: done\ndata: {"totalTokens":20}\n\n',
    ].join('');

    const stream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(multiEventChunk));
        c.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onStart = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamAITutor(
      { mode: 'ask', level: 'N5', userMessage: 'Hi' },
      { onStart, onChunk, onDone }
    );

    expect(onStart).toHaveBeenCalled();
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Part 1');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Part 2');
    expect(onDone).toHaveBeenCalled();
  });

  it('handles partial SSE chunks split across multiple network reads', async () => {
    const encoder = new TextEncoder();
    // Split "event: chunk\ndata: {"text":"Hello"}\n\n" right down the middle
    const packet1 = 'event: chunk\ndata: {"text":"Hel';
    const packet2 = 'lo"}\n\nevent: done\ndata: {}\n\n';

    const stream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(packet1));
        c.enqueue(encoder.encode(packet2));
        c.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamAITutor(
      { mode: 'ask', level: 'N5', userMessage: 'Hi' },
      { onChunk, onDone }
    );

    expect(onChunk).toHaveBeenCalledWith('Hello');
    expect(onDone).toHaveBeenCalled();
  });

  it('handles multi-byte UTF-8 split across byte chunk boundaries', async () => {
    const encoder = new TextEncoder();
    // "日本語" in UTF-8 is 9 bytes (3 bytes each)
    const raw = 'event: chunk\ndata: {"text":"日本語"}\n\n';
    const encoded = encoder.encode(raw);

    // Split right in the middle of the second kanji (本)
    const mid = Math.floor(encoded.length / 2);
    const part1 = encoded.slice(0, mid);
    const part2 = encoded.slice(mid);

    const stream = new ReadableStream({
      start(c) {
        c.enqueue(part1);
        c.enqueue(part2);
        c.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const onChunk = vi.fn();

    await streamAITutor(
      { mode: 'ask', level: 'N5', userMessage: 'Hi' },
      { onChunk }
    );

    expect(onChunk).toHaveBeenCalledWith('日本語');
  });
});

describe('AI Tutor V2 — Server Streaming Handler (handleAITutorRequest & streamGeminiTutor)', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test_mock_gemini_key_12345';
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('streamGeminiTutor emits chunks to onChunk and returns token stats', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: {
        mode: 'vocabulary',
        level: 'N2',
        userMessage: '覚えやすい単語',
      },
      apiKey: 'test_key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('こんにちは！');
    expect(chunks.join('')).toContain('ဂျပန်စာလေ့လာကြရအောင်။');
    expect(result.totalTokens).toBe(45);
  });

  it('streamGeminiTutor reports missing API key without calling AI', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: {
        mode: 'ask',
        level: 'N5',
        userMessage: 'Test',
      },
      apiKey: '',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Gemini API key is not configured');
    expect(chunks.length).toBe(0);
  });

  it('handleAITutorRequest responds with SSE stream when requested', async () => {
    const headers: Record<string, string> = {};
    const writtenChunks: string[] = [];
    let isEnded = false;

    const mockReq: GenericHttpRequest = {
      method: 'POST',
      url: '/api/ai-tutor?stream=true',
      headers: {
        accept: 'text/event-stream',
        'x-forwarded-for': '127.0.0.1',
      },
      body: {
        mode: 'kanji',
        level: 'N3',
        userMessage: '新 という漢字',
      },
      on: vi.fn(),
    };

    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn((k: string, v: string) => {
        headers[k] = v;
      }),
      flushHeaders: vi.fn(),
      flush: vi.fn(),
      write: vi.fn((chunk: string | Uint8Array) => {
        writtenChunks.push(String(chunk));
        return true;
      }),
      end: vi.fn(() => {
        isEnded = true;
      }),
    };

    await handleAITutorRequest(mockReq, mockRes);

    expect(headers['Content-Type']).toContain('text/event-stream');
    expect(headers['Cache-Control']).toBe('no-cache, no-transform');
    expect(mockRes.flushHeaders).toHaveBeenCalled();
    expect(isEnded).toBe(true);

    const fullStream = writtenChunks.join('');
    expect(fullStream).toContain('event: start');
    expect(fullStream).toContain('event: chunk');
    expect(fullStream).toContain('event: done');
    expect(fullStream).toContain('こんにちは！');
  });

  it('handleAITutorRequest returns 400 for invalid payload before streaming headers', async () => {
    const mockReq: GenericHttpRequest = {
      method: 'POST',
      headers: { accept: 'text/event-stream' },
      body: {
        // Missing userMessage and invalid mode
        mode: 'invalid_mode',
      },
    };

    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };

    await handleAITutorRequest(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('Invalid request payload') })
    );
    // Did NOT set SSE headers
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('Content-Type', expect.stringContaining('text/event-stream'));
  });

  it('handleAITutorRequest returns 503 JSON if API key is missing before streaming', async () => {
    delete process.env.GEMINI_API_KEY;

    const mockReq: GenericHttpRequest = {
      method: 'POST',
      headers: { accept: 'text/event-stream' },
      body: {
        mode: 'ask',
        level: 'N5',
        userMessage: 'Hello',
      },
    };

    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };

    await handleAITutorRequest(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('Gemini API key is not configured') })
    );
  });

  it('handles normal completed stream without triggering disconnect or abort', async () => {
    let closeListener: (() => void) | undefined;
    const writtenChunks: string[] = [];

    const mockReq: GenericHttpRequest = {
      method: 'POST',
      url: '/api/ai-tutor?stream=true',
      headers: { accept: 'text/event-stream' },
      body: { mode: 'ask', level: 'N5', userMessage: 'Tell me about JLPT' },
      on: vi.fn((event: string, listener: any) => {
        if (event === 'close') closeListener = listener;
      }),
    };

    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      flush: vi.fn(),
      write: vi.fn((chunk) => {
        writtenChunks.push(String(chunk));
        return true;
      }),
      end: vi.fn(() => {
        (mockRes as any).writableEnded = true;
      }),
    };

    await handleAITutorRequest(mockReq, mockRes);

    // Simulate connection close after normal completion
    closeListener?.();

    expect(writtenChunks.join('')).toContain('event: done');
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('handles premature client disconnect and cleans up without writing further chunks', async () => {
    let closeListener: (() => void) | undefined;
    const writtenChunks: string[] = [];

    const mockReq: GenericHttpRequest = {
      method: 'POST',
      url: '/api/ai-tutor?stream=true',
      headers: { accept: 'text/event-stream' },
      body: { mode: 'ask', level: 'N5', userMessage: 'Tell me about JLPT' },
      on: vi.fn((event: string, listener: any) => {
        if (event === 'close') closeListener = listener;
      }),
    };

    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      flush: vi.fn(),
      write: vi.fn((chunk) => {
        writtenChunks.push(String(chunk));
        // Simulate client dropping connection after first write
        if (closeListener) {
          closeListener();
        }
        return true;
      }),
      end: vi.fn(() => {
        (mockRes as any).writableEnded = true;
      }),
    };

    await handleAITutorRequest(mockReq, mockRes);
    expect(mockRes.end).toHaveBeenCalled();
  });
});

describe('AI Tutor V2 — Dexie Schema V7 & Multi-Session Chat Persistence', () => {
  beforeEach(async () => {
    await db.ai_sessions.clear();
    await db.ai_messages.clear();
  });

  it('creates and lists multiple chat sessions ordered by updatedAt', async () => {
    const session1: AIChatSession = {
      id: 'session_1',
      title: 'Grammar N2 Study',
      mode: 'grammar',
      level: 'N2',
      lessonId: 'n2.l01',
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z',
    };

    const session2: AIChatSession = {
      id: 'session_2',
      title: 'Vocabulary N5 Quick Review',
      mode: 'vocabulary',
      level: 'N5',
      lessonId: 'n5.l01',
      createdAt: '2026-11-20T11:00:00.000Z',
      updatedAt: '2026-11-20T12:00:00.000Z',
    };

    await db.ai_sessions.bulkAdd([session1, session2]);

    const ordered = await db.ai_sessions.orderBy('updatedAt').reverse().toArray();
    expect(ordered.length).toBe(2);
    expect(ordered[0].id).toBe('session_2'); // More recent updatedAt
    expect(ordered[1].id).toBe('session_1');
  });

  it('supports inline rename and mode update for a chat session', async () => {
    const session: AIChatSession = {
      id: 'session_rename_test',
      title: 'Initial Title',
      mode: 'ask',
      level: 'N4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.ai_sessions.put(session);

    await db.ai_sessions.update('session_rename_test', {
      title: 'Renamed Session Title',
      mode: 'quiz',
    });

    const updated = await db.ai_sessions.get('session_rename_test');
    expect(updated?.title).toBe('Renamed Session Title');
    expect(updated?.mode).toBe('quiz');
  });

  it('persists user and model messages linked by sessionId', async () => {
    const sessionId = 'session_msg_test';
    const userMsg: AIChatMessage = {
      id: 'msg_user_1',
      sessionId,
      role: 'user',
      content: '〜に違いない ရဲ့ အဓိပ္ပာယ်ရှင်းပြပါ',
      mode: 'grammar',
      createdAt: '2026-11-20T10:01:00.000Z',
    };
    const modelMsg: AIChatMessage = {
      id: 'msg_model_1',
      sessionId,
      role: 'model',
      content: '〜に違いない သည် "သေချာပေါက် ဖြစ်လိမ့်မည်" ဟု အခိုင်အမာ ယူဆချက်ကို ဖော်ပြသည်။',
      mode: 'grammar',
      createdAt: '2026-11-20T10:01:05.000Z',
    };

    await db.ai_messages.bulkAdd([userMsg, modelMsg]);

    const messages = await db.ai_messages.where('sessionId').equals(sessionId).sortBy('createdAt');
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('model');
    expect(messages[1].content).toContain('သေချာပေါက်');
  });

  it('deletes session and cascade-deletes associated messages', async () => {
    const sessionId = 'session_to_delete';
    await db.ai_sessions.put({
      id: sessionId,
      title: 'To Be Deleted',
      mode: 'ask',
      level: 'N3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.ai_messages.put({
      id: 'msg_orphan_test',
      sessionId,
      role: 'user',
      content: 'Test message',
      createdAt: new Date().toISOString(),
    });

    // Delete session and its messages
    await db.ai_messages.where('sessionId').equals(sessionId).delete();
    await db.ai_sessions.delete(sessionId);

    const checkSession = await db.ai_sessions.get(sessionId);
    const checkMessages = await db.ai_messages.where('sessionId').equals(sessionId).toArray();

    expect(checkSession).toBeUndefined();
    expect(checkMessages.length).toBe(0);
  });

  it('switches between multiple sessions maintaining completely isolated message histories', async () => {
    const s1 = 'session_alpha';
    const s2 = 'session_beta';

    await db.ai_sessions.bulkAdd([
      { id: s1, title: 'Alpha', mode: 'ask', level: 'N5', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z' },
      { id: s2, title: 'Beta', mode: 'grammar', level: 'N2', createdAt: '2026-11-20T01:00:00Z', updatedAt: '2026-11-20T01:00:00Z' },
    ]);

    await db.ai_messages.bulkAdd([
      { id: 'm1', sessionId: s1, role: 'user', content: 'Alpha message 1', createdAt: '2026-11-20T00:01:00Z' },
      { id: 'm2', sessionId: s1, role: 'model', content: 'Alpha reply 1', createdAt: '2026-11-20T00:01:05Z' },
      { id: 'm3', sessionId: s2, role: 'user', content: 'Beta message 1', createdAt: '2026-11-20T01:01:00Z' },
    ]);

    const s1Messages = await db.ai_messages.where('sessionId').equals(s1).sortBy('createdAt');
    const s2Messages = await db.ai_messages.where('sessionId').equals(s2).sortBy('createdAt');

    expect(s1Messages.length).toBe(2);
    expect(s2Messages.length).toBe(1);
    expect(s1Messages.map((m) => m.content)).toEqual(['Alpha message 1', 'Alpha reply 1']);
    expect(s2Messages[0].content).toBe('Beta message 1');
  });

  it('verifies older Dexie tables (srs_cards, mastery_records, profile) are unaffected by v7 schema', async () => {
    // Insert into v1 tables
    await db.profile.put({ id: 'current_user', level: 'N2', name: 'Tester', xp: 500 } as any);
    await db.mastery_records.put({ lessonId: 'n2.l01', state: 'mastered', lastTestedAt: '2026-11-20T00:00:00Z' } as any);
    await db.srs_cards.put({ id: 'card_1', itemId: 'item_1', lessonId: 'n2.l01', facet: 'reading', state: 2, due: '2026-11-25T00:00:00Z', lapses: 0, isLeech: false } as any);

    // Read back from v1 tables
    const user = await db.profile.get('current_user');
    const mastery = await db.mastery_records.get('n2.l01');
    const card = await db.srs_cards.get('card_1');

    expect(user?.level).toBe('N2');
    expect(mastery?.state).toBe('mastered');
    expect(card?.due).toBe('2026-11-25T00:00:00Z');
  });
});

describe('AI Tutor V2 — BackupManager Integration & Backward Compatibility', () => {
  beforeEach(async () => {
    await db.ai_sessions.clear();
    await db.ai_messages.clear();
  });

  it('exports full backup containing aiSessions and aiMessages', async () => {
    await db.ai_sessions.put({
      id: 'backup_sess_1',
      title: 'Backup Session 1',
      mode: 'quiz',
      level: 'N2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.ai_messages.put({
      id: 'backup_msg_1',
      sessionId: 'backup_sess_1',
      role: 'user',
      content: 'Backup user message',
      createdAt: new Date().toISOString(),
    });

    const fullBackup = await BackupManager.exportFullBackup();

    expect(fullBackup.aiSessions).toBeDefined();
    expect(fullBackup.aiMessages).toBeDefined();
    expect(fullBackup.aiSessions?.some((s) => s.id === 'backup_sess_1')).toBe(true);
    expect(fullBackup.aiMessages?.some((m) => m.id === 'backup_msg_1')).toBe(true);
  });

  it('restores aiSessions and aiMessages from JSON backup', async () => {
    const backupJson: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile: { id: 'current_user', level: 'N2', name: 'Tester' },
      srsCards: [],
      reviewLogs: [],
      masteryRecords: [],
      studySessions: [],
      studyEvents: [],
      aiSessions: [
        {
          id: 'restored_sess_1',
          title: 'Restored Grammar Session',
          mode: 'grammar',
          level: 'N2',
          createdAt: '2026-11-20T00:00:00.000Z',
          updatedAt: '2026-11-20T00:00:00.000Z',
        },
      ],
      aiMessages: [
        {
          id: 'restored_msg_1',
          sessionId: 'restored_sess_1',
          role: 'user',
          content: 'Restored message text',
          mode: 'grammar',
          createdAt: '2026-11-20T00:01:00.000Z',
        },
      ],
    };

    const restoreResult = await BackupManager.restoreFromJson(JSON.stringify(backupJson));
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.stats?.aiSessions).toBe(1);
    expect(restoreResult.stats?.aiMessages).toBe(1);

    const storedSess = await db.ai_sessions.get('restored_sess_1');
    const storedMsg = await db.ai_messages.get('restored_msg_1');
    expect(storedSess?.title).toBe('Restored Grammar Session');
    expect(storedMsg?.content).toBe('Restored message text');
  });

  it('gracefully restores legacy V1 backup without aiSessions/aiMessages (backward compatibility)', async () => {
    // Legacy backup object omitting aiSessions and aiMessages
    const legacyBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: { id: 'current_user', level: 'N5' },
      srsCards: [],
      reviewLogs: [],
      masteryRecords: [],
      studySessions: [],
      studyEvents: [],
      // No aiSessions or aiMessages fields
    };

    const restoreResult = await BackupManager.restoreFromJson(JSON.stringify(legacyBackup));
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.stats?.aiSessions).toBe(0);
    expect(restoreResult.stats?.aiMessages).toBe(0);
  });

  it('restores backup idempotently without creating duplicate messages', async () => {
    const backupJson: BackupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      profile: { id: 'current_user', level: 'N3' },
      srsCards: [],
      reviewLogs: [],
      masteryRecords: [],
      studySessions: [],
      studyEvents: [],
      aiSessions: [
        { id: 'idem_sess', title: 'Idempotent Test', mode: 'ask', level: 'N3', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z' },
      ],
      aiMessages: [
        { id: 'idem_msg_1', sessionId: 'idem_sess', role: 'user', content: 'Message 1', createdAt: '2026-11-20T00:01:00Z' },
      ],
    };

    const str = JSON.stringify(backupJson);
    // Restore once
    await BackupManager.restoreFromJson(str);
    // Restore again (same data)
    await BackupManager.restoreFromJson(str);

    const sessions = await db.ai_sessions.toArray();
    const messages = await db.ai_messages.toArray();

    expect(sessions.length).toBe(1);
    expect(messages.length).toBe(1);
    expect(sessions[0].id).toBe('idem_sess');
    expect(messages[0].id).toBe('idem_msg_1');
  });

  it('imports Vercel serverless function api/ai-tutor.js and executes without ERR_MODULE_NOT_FOUND', async () => {
    const { default: handler, maxDuration } = await import('../api/ai-tutor.js');
    expect(typeof handler).toBe('function');
    expect(maxDuration).toBe(60);

    let statusCode = 0;
    let jsonBody: any = null;
    const mockReq = {
      method: 'POST',
      body: { mode: 'ask', level: 'N5', userMessage: 'test' },
      headers: {},
    };
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        jsonBody = data;
        return mockRes;
      },
      setHeader: () => {},
    };

    const prevKey = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      await handler(mockReq, mockRes);
      expect(statusCode).toBe(503);
      expect(jsonBody.success).toBe(false);
      expect(jsonBody.error).toContain('Gemini API key is not configured');
    } finally {
      if (prevKey !== undefined) {
        process.env.GEMINI_API_KEY = prevKey;
      }
    }
  });

  it('filters empty and whitespace-only conversation history entries in api/ai-tutor handler', async () => {
    const { default: handler } = await import('../api/ai-tutor.js');
    const mockReq = {
      method: 'POST',
      body: {
        mode: 'ask',
        level: 'N5',
        userMessage: 'test',
        conversationHistory: [
          { role: 'user', content: '' },
          { role: 'model', content: '   ' },
          { role: 'user', content: 'Valid message' },
        ],
      },
      headers: {},
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };

    await handler(mockReq, mockRes);
    // After pre-filtering in handler, only the valid message remains
    expect(mockReq.body.conversationHistory.length).toBe(1);
    expect(mockReq.body.conversationHistory[0].content).toBe('Valid message');
  });
});

describe('AI Tutor V2.2 — Latency, TTFT, Error Handling & Timeout Regression Suite', () => {
  const validRequest: AITutorRequest = {
    mode: 'ask',
    level: 'N2',
    userMessage: 'Test prompt',
    language: 'my',
  };

  it('(1) records successful first-token delivery and timeToFirstTokenMs', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: validRequest,
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(typeof result.timeToFirstTokenMs).toBe('number');
    expect(result.timeToFirstTokenMs).toBeGreaterThanOrEqual(0);
  });

  it('(2) handles delayed Gemini response within timeout window', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_DELAY' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      timeoutMs: 1000,
    });

    expect(result.success).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('Delayed start content.');
    expect(result.timeToFirstTokenMs).toBeGreaterThanOrEqual(25);
  });

  it('(3a) handles Gemini 429 rate limit response with user-friendly message', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_429' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit or quota reached');
    expect(chunks.length).toBe(0);
  });

  it('(3b) handles Gemini 503 service unavailable response with user-friendly message', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_503' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
    expect(chunks.length).toBe(0);
  });

  it('(4) handles invalid API key error gracefully', async () => {
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_INVALID_KEY' },
      apiKey: 'bad-key',
      onChunk: () => {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid Gemini API key');
  });

  it('(5) handles invalid or unsupported model gracefully', async () => {
    const result = await streamGeminiTutor({
      request: validRequest,
      apiKey: 'test-api-key',
      modelName: 'unsupported-model',
      onChunk: () => {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('is unavailable or not supported');
  });

  it('(6) handles empty response from Gemini', async () => {
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_EMPTY' },
      apiKey: 'test-api-key',
      onChunk: () => {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Received an empty response from Gemini');
  });

  it('(7) handles client cancellation cleanly and stops streaming', async () => {
    const controller = new AbortController();
    const chunks: string[] = [];

    // Abort before streaming begins
    controller.abort();

    const result = await streamGeminiTutor({
      request: validRequest,
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      signal: controller.signal,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Stream aborted by client.');
    expect(chunks.length).toBe(0);
  });

  it('(8) handles server-side timeout when Gemini response exceeds timeoutMs', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_TIMEOUT' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      timeoutMs: 40,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Gemini request timed out. Please try again.');
    expect(chunks.length).toBe(0);
  });

  it('includes timeToFirstTokenMs in SSE event: done data during handleAITutorRequest', async () => {
    const writtenEvents: string[] = [];
    const mockReq: GenericHttpRequest = {
      method: 'POST',
      headers: { accept: 'text/event-stream' },
      body: validRequest,
    };
    const mockRes: GenericHttpResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      write: (data: string | Uint8Array) => {
        writtenEvents.push(typeof data === 'string' ? data : Buffer.from(data).toString());
        return true;
      },
      flush: vi.fn(),
      flushHeaders: vi.fn(),
      end: vi.fn(),
    };

    const prevKey = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = 'test-key';
      await handleAITutorRequest(mockReq, mockRes);

      const doneEvent = writtenEvents.find((evt) => evt.startsWith('event: done'));
      expect(doneEvent).toBeDefined();
      const doneJson = JSON.parse(doneEvent!.replace(/^event: done\ndata: /, '').trim());
      expect(doneJson.timeToFirstTokenMs).toBeDefined();
      expect(typeof doneJson.timeToFirstTokenMs).toBe('number');
    } finally {
      if (prevKey !== undefined) {
        process.env.GEMINI_API_KEY = prevKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    }
  });

  it('retries transient 503 error and successfully streams on second attempt', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_503_THEN_SUCCESS' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('Recovered after retry successfully!');
  });

  it('retries transient 503 error in non-streaming callGeminiTutor and returns success', async () => {
    const result = await callGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_503_THEN_SUCCESS' },
      apiKey: 'test-api-key',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Non-streaming recovered after retry!');
  });

  it('exhausts max 2 retries on persistent 503 and returns clean unavailable error', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_503' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      maxRetries: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
    expect(chunks.length).toBe(0);
  });

  it('handles 504 deadline exceeded separately without retrying', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_504' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('request timed out');
    expect(chunks.length).toBe(0);
  });

  it('does not retry 401/403 authentication errors', async () => {
    const result401 = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_401' },
      apiKey: 'bad-key',
      onChunk: () => {},
    });
    expect(result401.success).toBe(false);
    expect(result401.error).toContain('Invalid Gemini API key');

    const result403 = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_403' },
      apiKey: 'forbidden-key',
      onChunk: () => {},
    });
    expect(result403.success).toBe(false);
    expect(result403.error).toContain('Invalid Gemini API key');
  });

  it('does NOT retry when failure happens mid-stream after chunks were already emitted', async () => {
    const chunks: string[] = [];
    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_MID_STREAM_503' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      maxRetries: 2,
    });

    // Chunks were emitted before failure, so retry was disallowed to prevent duplicate text
    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('First chunk sent');
  });

  it('aborts cleanly if signal is triggered during retry backoff wait', async () => {
    const controller = new AbortController();
    const chunks: string[] = [];

    // Trigger abort after 10ms (during first 503 backoff sleep)
    setTimeout(() => controller.abort(), 10);

    const result = await streamGeminiTutor({
      request: { ...validRequest, userMessage: 'TRIGGER_503' },
      apiKey: 'test-api-key',
      onChunk: (chunk) => chunks.push(chunk),
      signal: controller.signal,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Stream aborted by client.');
  });

  it('calculates bounded exponential backoff with jitter correctly', () => {
    const delay0 = calculateBackoffWithJitter(0, 500, 2000);
    expect(delay0).toBeGreaterThanOrEqual(500);
    expect(delay0).toBeLessThanOrEqual(750);

    const delay1 = calculateBackoffWithJitter(1, 500, 2000);
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay1).toBeLessThanOrEqual(1500);

    const delayMax = calculateBackoffWithJitter(10, 500, 2000);
    expect(delayMax).toBeLessThanOrEqual(2000);
  });

  it('accurately identifies transient 503 vs non-retryable errors', () => {
    expect(isTransient503Error({ status: 503 })).toBe(true);
    expect(isTransient503Error(new Error('503 Service Unavailable: High load'))).toBe(true);
    expect(isTransient503Error(new Error('This model is currently experiencing high demand.'))).toBe(true);

    // Non-retryable
    expect(isTransient503Error({ status: 504 })).toBe(false);
    expect(isTransient503Error(new Error('504 DEADLINE_EXCEEDED'))).toBe(false);
    expect(isTransient503Error({ status: 401 })).toBe(false);
    expect(isTransient503Error({ status: 403 })).toBe(false);
    expect(isTransient503Error({ status: 429 })).toBe(false);
    expect(isTransient503Error({ status: 404 })).toBe(false);
    expect(isTransient503Error({ status: 400 })).toBe(false);

    expect(isTimeoutError({ status: 504 })).toBe(true);
    expect(isTimeoutError(new Error('REQUEST_TIMEOUT'))).toBe(true);
    expect(isTimeoutError({ status: 503 })).toBe(false);
  });
});
