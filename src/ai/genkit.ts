import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This file is now simplified to always use the default Google AI plugin.
// The flow itself will handle any dynamic provider/API key logic.
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
});
