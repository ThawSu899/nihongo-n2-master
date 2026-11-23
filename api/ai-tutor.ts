import { handleAITutorRequest } from '../server/gemini-tutor-service.js';

// Configure execution duration for Vercel Serverless Function (up to 60s for LLM streaming)
export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  // Pre-filter conversationHistory to drop empty or whitespace-only messages
  if (req?.body) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // ignore JSON parse error, handleAITutorRequest will handle validation
      }
    }
    if (Array.isArray(req.body.conversationHistory)) {
      req.body.conversationHistory = req.body.conversationHistory.filter(
        (m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0
      );
    }
  }
  await handleAITutorRequest(req, res);
}
