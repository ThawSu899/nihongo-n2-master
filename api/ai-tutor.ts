import { handleAITutorRequest } from '../server/gemini-tutor-service';

// Configure execution duration for Vercel Serverless Function (up to 60s for LLM streaming)
export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  await handleAITutorRequest(req, res);
}
