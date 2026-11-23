/**
 * Single Request Diagnostics Script for Google Gemini API
 * Tests single minimal request to verify connectivity, measure latency,
 * and diagnose HTTP status / errors without personal or learner data.
 *
 * Usage:
 *   npx tsx scripts/verify-gemini-single.ts [modelName]
 * Example:
 *   npx tsx scripts/verify-gemini-single.ts gemini-3.8-flash
 *   npx tsx scripts/verify-gemini-single.ts gemini-3.6-flash
 */
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface SingleDiagnosticResult {
  model: string;
  success: boolean;
  httpStatus?: number;
  elapsedMs: number;
  responsePreview?: string;
  error?: string;
}

export async function runSingleDiagnostic(targetModel?: string): Promise<SingleDiagnosticResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = targetModel || process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

  if (!apiKey) {
    const err = 'GEMINI_API_KEY is not configured in environment or .env';
    return {
      model,
      success: false,
      httpStatus: 401,
      elapsedMs: 0,
      error: err,
    };
  }

  const prompt = 'Reply only: OK';
  const startTime = Date.now();

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 30000 },
    });

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 50,
        temperature: 0.2,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const elapsedMs = Date.now() - startTime;
    const responseText = response?.text?.trim() || '';

    return {
      model,
      success: true,
      httpStatus: 200,
      elapsedMs,
      responsePreview: responseText.slice(0, 100),
    };
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime;
    const status =
      err?.status ||
      err?.statusCode ||
      (err?.response && typeof err.response.status === 'number' ? err.response.status : undefined);

    let rawErrMsg = String(err?.message || err);
    // Sanitize API key from logs
    if (apiKey) {
      rawErrMsg = rawErrMsg.split(apiKey).join('[REDACTED_KEY]');
    }
    const sanitizedError = rawErrMsg.replace(/key=[^&"\s]+/gi, 'key=REDACTED');

    return {
      model,
      success: false,
      httpStatus: typeof status === 'number' ? status : undefined,
      elapsedMs,
      error: sanitizedError,
    };
  }
}

async function main() {
  const modelArg = process.argv[2];
  const targetModel = modelArg || process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';

  console.log('====================================================');
  console.log('   GEMINI API SINGLE REQUEST DIAGNOSTICS           ');
  console.log('====================================================');
  console.log(`Target Model   : ${targetModel}`);
  console.log('Minimal Prompt : "Reply only: OK"');
  console.log('Testing connectivity...\n');

  const result = await runSingleDiagnostic(targetModel);

  console.log(`Success        : ${result.success ? 'YES' : 'NO'}`);
  console.log(`Elapsed Time   : ${result.elapsedMs}ms`);
  console.log(`HTTP Status    : ${result.httpStatus ?? 'Unknown'}`);

  if (result.success) {
    console.log(`Response       : ${result.responsePreview}`);
  } else {
    console.log(`Error Details  : ${result.error}`);
  }
  console.log('====================================================\n');

  if (!result.success) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  main();
}
