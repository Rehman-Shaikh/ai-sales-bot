import { generateJSON } from './gemini.js';
import { SUMMARY_PROMPT } from './prompts.js';
import { STATUSES } from '../models/Call.js';

const has = (text, words) => words.some(w => text.includes(w));

// Rule-based safety net + validation on top of the LLM's classification.
export function resolveStatus(llmStatus, userText, userTurns) {
  if (userTurns === 0 || userText.trim().split(/\s+/).length < 3) return 'No Response';
  const t = userText.toLowerCase();
  if (has(t, ['demo', 'डेमो', 'डिमो'])) return 'Demo Requested';
  if (STATUSES.includes(llmStatus)) return llmStatus;
  if (has(t, ['not interested', 'no thanks', 'नहीं चाहिए', 'interested nahi'])) return 'Not Interested';
  if (has(t, ['think', 'call me later', 'baad me', 'discuss'])) return 'Follow-up Required';
  return 'Interested';
}

export async function summarizeCall(transcript) {
  const userTurns = transcript.filter(m => m.role === 'user').length;
  const userText = transcript.filter(m => m.role === 'user').map(m => m.text).join(' ');
  const empty = { bullets: ['Customer did not respond during the call.'], requirements: [], objections: [], opportunities: [], profile: {}, budgetSignals: 'Not discussed', recommendedPlan: 'None', nextAction: 'Try calling again later.', followUpNotes: '' };

  if (userTurns === 0) return { ...empty, status: 'No Response' };

  let result;
  try {
    const text = transcript.map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.text}`).join('\n');
    result = await generateJSON(SUMMARY_PROMPT, text);
  } catch (e) {
    console.error('Summary failed', e.message);
    result = { ...empty, bullets: ['Summary generation failed. Please read the transcript.'] };
  }
  result.status = resolveStatus(result.status, userText, userTurns);
  return result;
}
