import {
  AITutorRequest,
  AITutorResponse,
  CompactLessonContext,
} from '../../server/gemini-tutor-service';
import { LessonPack } from '../domain/models/types';

export interface StreamCallbacks {
  onStart?: (info: { model?: string; mode?: string }) => void;
  onChunk: (chunk: string) => void;
  onDone?: (info?: { totalTokens?: number; mode?: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Pure SSE block parser that extracts event type and data payload.
 * Supports standard SSE format (`event: <type>\ndata: <json>\n\n`).
 */
export function parseSSEBlock(block: string): { event: string; data: string } | null {
  const normalized = block.replace(/\r\n/g, '\n').trim();
  if (!normalized) return null;

  let event = 'message';
  const dataLines: string[] = [];

  const lines = normalized.split('\n');
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * Streams real-time AI Tutor responses using Server-Sent Events (SSE).
 * Correctly decodes multi-byte UTF-8 streams (Japanese Kanji and Burmese script).
 */
export async function streamAITutor(
  request: AITutorRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. An active internet connection is required for AI Tutor.');
  }

  const response = await fetch('/api/ai-tutor?stream=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        errorDetail = errJson.error;
      }
    } catch {
      // Non-JSON error body
    }
    const err = new Error(errorDetail);
    callbacks.onError?.(err);
    throw err;
  }

  if (!response.body) {
    const err = new Error('ReadableStream not supported or empty response body received.');
    callbacks.onError?.(err);
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const processBlock = (block: string) => {
    const parsed = parseSSEBlock(block);
    if (!parsed) return;

    try {
      const payload = JSON.parse(parsed.data);
      if (parsed.event === 'start') {
        callbacks.onStart?.(payload);
      } else if (parsed.event === 'chunk') {
        if (payload?.text) {
          callbacks.onChunk(payload.text);
        }
      } else if (parsed.event === 'done') {
        callbacks.onDone?.(payload);
      } else if (parsed.event === 'error') {
        const error = new Error(payload?.error || 'Stream error');
        callbacks.onError?.(error);
      }
    } catch {
      // If data is raw text rather than JSON
      if (parsed.event === 'chunk') {
        callbacks.onChunk(parsed.data);
      }
    }
  };

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Look for event boundaries (\n\n)
      let boundaryIndex: number;
      while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);
        processBlock(block);
      }
    }

    // Flush any remaining characters in the stream decoder
    buffer += decoder.decode();
    if (buffer.trim()) {
      processBlock(buffer);
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return;
    }
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Sends a context-aware request to the server-side Gemini AI Tutor API.
 * Never accesses GEMINI_API_KEY directly from the browser.
 */
export async function askAITutor(
  request: AITutorRequest,
  signal?: AbortSignal
): Promise<AITutorResponse> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. An active internet connection is required for AI Tutor.');
  }

  const response = await fetch('/api/ai-tutor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse server response (${response.status} ${response.statusText})`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data?.error || `Server error (${response.status})`);
  }

  return data as AITutorResponse;
}

/**
 * Transforms an in-memory LessonPack into a lightweight, compact context object
 * for the AI Tutor prompt. This extracts key pedagogical points while strictly bounding token usage.
 */
export function buildCompactLessonContext(pack: LessonPack): CompactLessonContext {
  return {
    lessonId: pack.id,
    level: pack.level,
    title: pack.title,
    description: pack.description,
    grammars: (pack.grammars || []).slice(0, 8).map((g) => ({
      title: g.pattern || (g as any).title || 'Grammar Point',
      meaning: g.meaning,
      formation: g.formation,
    })),
    vocabularies: (pack.vocabularies || []).slice(0, 16).map((v) => ({
      ja: v.ja,
      kana: v.kana,
      en: v.en,
      my: v.my || v.meaningMy || v.meaningMyanmar || v.myanmar,
      pos: v.pos,
    })),
    kanjis: (pack.kanjis || []).slice(0, 10).map((k) => ({
      char: k.char,
      meaning: k.meaning,
      onyomi: k.onyomi,
      kunyomi: k.kunyomi,
    })),
    sentences: (pack.sentences || []).slice(0, 5).map((s) => ({
      ja: s.ja,
      en: s.translation?.en || (s as any).en || '',
      my: s.translation?.my || s.translationMy || s.meaningMy || (s as any).my,
    })),
  };
}
