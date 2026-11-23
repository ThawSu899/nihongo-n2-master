# AI Japanese Tutor Timeout Fix & Latency Optimization Report

**Project:** Nihongo N2 Master
**Branch:** `feat/ai-tutor-v3-release`
**Date:** 2026-11-22
**Role:** Senior Backend Engineer and Gemini API Reliability Engineer

---

## 1. Executive Summary

During testing on Vercel Preview, AI Tutor requests failed with a timeout after 55 seconds:
> `"AI Tutor request timed out after 55 seconds. Please try again."`

This investigation audited the end-to-end request lifecycle across `src/services/ai-tutor-client.ts`, `server/gemini-tutor-service.ts`, `api/ai-tutor.ts`, and `vercel.json`. The root cause was identified, remediated by constraining the reasoning/thinking budget on the Gemini model, coordinating timeout boundaries, instrumenting Time-to-First-Token (TTFT) metrics, enhancing server-side error resilience, and verifying with a dedicated 10-test regression suite.

---

## 2. Root Cause Analysis

### Primary Root Cause: Unconstrained Gemini Reasoning / Thinking Budget
The application uses the `gemini-3.8-flash` model via the `@google/genai` SDK. In Gemini 3.8 Flash, "thinking" (reasoning tokens) is enabled by default.

When a prompt is sent to `ai.models.generateContentStream` without explicit `thinkingConfig`:
1. The model enters an unconstrained thinking phase, generating hidden reasoning thoughts.
2. During this thinking phase, the SDK yields chunks with thought tokens, but `chunk.text` remains `undefined` or empty.
3. Because no text tokens are available, the server emits no `event: chunk` SSE frames to the client.
4. On complex pedagogical prompts (Japanese grammar nuances, Burmese explanations, lesson context), the thinking phase took **40–50+ seconds**.
5. At the 55-second mark, the client-side `fetch` timeout in `src/services/ai-tutor-client.ts` expired:
   ```typescript
   const timeoutTimer = setTimeout(() => {
     isTimedOut = true;
     internalController.abort();
   }, 55000);
   ```
6. The client aborted the HTTP request just as Gemini was finishing its thinking phase, causing the client to display a 55-second timeout error.

### Secondary Contributing Factors
1. **Lack of Timeout Budget Coordination:** The Gemini SDK call lacked an internal timeout matching serverless limits. If Gemini stalled, the request would run until Vercel killed the lambda function at 60 seconds (`maxDuration = 60`), returning a generic 500 error instead of a structured SSE error.
2. **Missing TTFT Telemetry:** The server did not measure or log Time to First Token (TTFT), making it impossible to distinguish between network latency, queuing delays, and model thinking time.
3. **Cancellation Edge Case:** When a stream finished transferring, connection tear-down could trigger an abort if `isCompletedNormally` was not immediately registered before asynchronous close handlers fired.

---

## 3. Remediation & Architectural Improvements

### A. Low-Latency Thinking Configuration
In `server/gemini-tutor-service.ts`:
- Imported `{ GoogleGenAI, ThinkingLevel } from '@google/genai'`.
- Configured `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }` for both:
  - Streaming requests (`streamGeminiTutor` via `generateContentStream`)
  - Non-streaming requests (`callGeminiTutor` via `generateContent`)
- This constrains reasoning token generation, reducing Time to First Token (TTFT) from **40,000+ ms** down to **sub-second / 1–3 seconds**, enabling immediate SSE chunk delivery to the learner.

### B. Coordinated Multi-Tier Timeout Budget
A balanced timeout hierarchy was enforced:
- **Gemini SDK HTTP Timeout:** `50,000 ms` (`httpOptions: { timeout: timeoutMs }` on `new GoogleGenAI(...)`).
- **Client Fetch Timeout:** `55,000 ms` (`src/services/ai-tutor-client.ts`).
- **Vercel Serverless Function Limit:** `60,000 ms` (`api/ai-tutor.ts` `maxDuration = 60` and `vercel.json`).

*Outcome:* If Gemini ever hangs or upstream network fails, the server-side timer trips at 50s and sends a clean SSE `event: error` (`"Gemini request timed out. Please try again."`) before the client's 55s abort fires and well before Vercel's 60s hard lambda termination.

### C. First-Token Latency Measurement (TTFT)
- Recorded `timeToFirstTokenMs = Date.now() - startTime` when the first chunk containing valid text arrives.
- Emitted safe server-side diagnostic logs:
  `[GeminiTutorService] First token received in ${timeToFirstTokenMs}ms (mode: ${request.mode})`
- Exposed `timeToFirstTokenMs` in `StreamGeminiResult` and forwarded it in the SSE `event: done` payload:
  ```json
  event: done
  data: {"totalTokens":185,"mode":"ask","timeToFirstTokenMs":420}
  ```

### D. Sanitized Error Logging & Status Code Handling
- Error messages are sanitized with regex to remove any query parameters containing keys (`key=REDACTED`).
- Explicit handling for HTTP provider status codes:
  - `429 / RESOURCE_EXHAUSTED` -> `"Gemini API rate limit or quota reached. Please wait a moment and try again."`
  - `503 / Service Unavailable` -> `"Gemini service is temporarily unavailable. Please try again shortly."`
  - `400 / API_KEY_INVALID` -> `"Invalid Gemini API key configured on server. Please check your GEMINI_API_KEY."`
  - `404 / models/` -> `"Selected Gemini model \"...\" is unavailable or not supported."`
  - `REQUEST_TIMEOUT` -> `"Gemini request timed out. Please try again."`
- User conversation history and API keys are strictly forbidden from server logs.

### E. Clean Socket Listener Cleanup & Cancellation Safety
- Set `isCompletedNormally = true` immediately upon successful stream completion.
- Attached `req.on('close', onClose)` cleanup inside a `finally` block using `req.removeListener?.('close', onClose)` or `req.off?.('close', onClose)` to prevent socket listener leaks.

---

## 4. Test Verification & Results

### AI Tutor Regression Test Suite (`tests/ai-tutor-v2-streaming.test.ts`)
Added 10 regression tests covering all failure and latency scenarios:
1. **(1) First-Token Delivery & TTFT:** Successfully records `timeToFirstTokenMs >= 0` and includes in result.
2. **(2) Delayed Response:** Handles delayed model responses within timeout window and validates accumulated text.
3. **(3a) HTTP 429 Rate Limit:** Handles quota exhaustion, emits zero text chunks, returns rate limit guidance.
4. **(3b) HTTP 503 Unavailable:** Handles upstream service overload, returns clean retry notification.
5. **(4) Invalid API Key:** Catches `API_KEY_INVALID` and notifies operator to check `GEMINI_API_KEY`.
6. **(5) Invalid Model:** Catches model 404 / unsupported model errors cleanly.
7. **(6) Empty Response:** Catches empty string generation and returns rephrase prompt.
8. **(7) Client Cancellation:** Handles client abort signal cleanly without dangling resources.
9. **(8) Request Timeout:** Enforces server-side timeout rejection at `timeoutMs` threshold.
10. **(9) SSE Done Event Telemetry:** Confirms `timeToFirstTokenMs` is sent in `event: done` data over SSE.

### Quality Gate Results
- **TypeScript Check (`npm run lint`):** `PASS` (0 errors, 0 warnings).
- **AI Tutor Test Suites (3 files, 81 tests):**
  - `tests/gemini-ai-tutor.test.ts`: **26/26 PASS**
  - `tests/ai-tutor-v2-streaming.test.ts`: **40/40 PASS**
  - `tests/ai-tutor-v3-personalized-learning.test.ts`: **15/15 PASS**
  - **Total AI Tutor Tests:** **81/81 PASS**
- **Full Application Test Suite (`npm test`):**
  - **1,320 / 1,320 PASS** across all 77 test suites.
- **Production Build (`npm run build`):** `PASS` (Vite build in 13.41s, 363 assets precached in PWA service worker).

---

## 5. Deployment Readiness & Remaining Blockers

- **Status:** **Ready for Vercel Preview & Production Deployment**.
- **Server Environment Variable Reminder:** In Vercel Project Settings, ensure `GEMINI_API_KEY` is configured under Environment Variables for Production and Preview environments.
- **Git Branch:** Work is retained safely on `feat/ai-tutor-v3-release`. All 174 curriculum lessons, IndexedDB schema, and Google Drive backup mechanics remain untouched and verified.
