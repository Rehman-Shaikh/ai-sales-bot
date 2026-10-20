const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ = 'https://api.groq.com/openai/v1';

// Models that exist on the free tier today. Tried in this order.
const GROQ_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];

const key = name => process.env[name]?.trim();
// Built-in models come first. Names from .env (optional) are only added as extra fallbacks.
const modelList = (name, defaults) =>
  [...new Set([...defaults, ...(key(name) || '').split(',').map(m => m.trim())].filter(Boolean))];

// Gemini needs the first turn from the user and alternating roles. Merge same-role neighbours.
function normalize(messages) {
  const out = [];
  for (const m of messages) {
    const text = (m.text || '').trim();
    if (!text) continue;
    const last = out.at(-1);
    if (last && last.role === m.role) last.text += ' ' + text;
    else out.push({ role: m.role, text });
  }
  if (out[0]?.role === 'assistant') out.unshift({ role: 'user', text: 'Hello' });
  return out;
}

const post = (url, headers, body, signal) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });

const short = s => s.replace(/\s+/g, ' ').slice(0, 160);
// Statuses where it makes sense to try the next model: bad request, missing model, quota, overload
const SKIP_TO_NEXT = [400, 404, 429, 503];

async function callGroq(system, messages, { json, temperature, maxTokens }, signal) {
  const errors = [];
  for (const model of modelList('GROQ_MODEL', GROQ_MODELS)) {
    const oss = /gpt-oss/.test(model); // reasoning models: keep reasoning short, leave token room for the reply
    const base = {
      model, temperature,
      max_tokens: oss ? maxTokens + 500 : maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.text }))],
    };
    const attempts = oss ? [{ ...base, reasoning_effort: 'low', include_reasoning: false }, base] : [base];
    for (const [i, body] of attempts.entries()) {
      const res = await post(`${GROQ}/chat/completions`, { Authorization: `Bearer ${key('GROQ_API_KEY')}` }, body, signal);
      if (res.ok) {
        const text = (await res.json()).choices?.[0]?.message?.content || '';
        if (text.trim()) return text;
        errors.push(`${model}: empty reply`);
        break;
      }
      const err = `${model} ${res.status}: ${short(await res.text())}`;
      if (res.status === 400 && i < attempts.length - 1) continue; // retry without the reasoning options
      errors.push(err);
      if (!SKIP_TO_NEXT.includes(res.status)) throw new Error('Groq ' + errors.join(' | '));
      break;
    }
  }
  throw new Error('Groq ' + errors.join(' | '));
}

async function callGemini(system, messages, { json, temperature, maxTokens }, signal) {
  const errors = [];
  for (const model of modelList('GEMINI_MODEL', GEMINI_MODELS)) {
    const v3 = /gemini-3/.test(model);
    const v25 = /2\.5/.test(model);
    const gc = {
      temperature,
      maxOutputTokens: v3 || v25 ? maxTokens + 1000 : maxTokens, // thinking tokens count against this limit
      ...(json ? { responseMimeType: 'application/json' } : {}),
    };
    const attempts = v3 ? [{ ...gc, thinkingConfig: { thinkingLevel: 'low' } }, gc]
      : v25 ? [{ ...gc, thinkingConfig: { thinkingBudget: 0 } }, gc] : [gc];
    for (const [i, generationConfig] of attempts.entries()) {
      const res = await post(`${GEMINI}/${model}:generateContent?key=${key('GEMINI_API_KEY')}`, {}, {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
        generationConfig,
      }, signal);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text).join('') || '';
        if (text.trim()) return text;
        errors.push(`${model}: empty reply`);
        break;
      }
      const err = `${model} ${res.status}: ${short(await res.text())}`;
      if (res.status === 400 && i < attempts.length - 1) continue; // retry without the thinking options
      errors.push(err);
      if (!SKIP_TO_NEXT.includes(res.status)) throw new Error('Gemini ' + errors.join(' | '));
      break;
    }
  }
  throw new Error('Gemini ' + errors.join(' | '));
}

// Tries Groq first (fastest), then Gemini. Whichever keys exist in .env are used.
async function run(system, rawMessages, opts, signal) {
  const messages = normalize(rawMessages);
  const providers = [];
  if (key('GROQ_API_KEY')) providers.push(callGroq);
  if (key('GEMINI_API_KEY')) providers.push(callGemini);
  let lastErr;
  for (const provider of providers) {
    try {
      return await provider(system, messages, opts, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
      console.warn('LLM provider failed:', e.message);
    }
  }
  throw lastErr || new Error('No LLM API key found. Check server/.env and restart the server.');
}

export const chat = (system, messages, signal) =>
  run(system, messages, { temperature: 0.8, maxTokens: 260 }, signal);

export async function generateJSON(system, userText) {
  const raw = await run(system, [{ role: 'user', text: userText }], { json: true, temperature: 0.2, maxTokens: 1200 });
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// Open http://localhost:5000/api/chat/diagnose to see which provider works and why.
export async function diagnose() {
  const test = [{ role: 'user', text: 'Say hi in three words.' }];
  const opts = { temperature: 0.2, maxTokens: 30 };
  const report = {
    groqModelsTried: modelList('GROQ_MODEL', GROQ_MODELS),
    geminiModelsTried: modelList('GEMINI_MODEL', GEMINI_MODELS),
    groq: 'GROQ_API_KEY not set in server/.env',
    gemini: 'GEMINI_API_KEY not set in server/.env',
  };
  if (key('GROQ_API_KEY')) {
    report.groq = await callGroq('You are helpful.', test, opts).then(t => 'OK: ' + t.trim().slice(0, 40)).catch(e => 'FAILED: ' + e.message);
  }
  if (key('GEMINI_API_KEY')) {
    report.gemini = await callGemini('You are helpful.', test, opts).then(t => 'OK: ' + t.trim().slice(0, 40)).catch(e => 'FAILED: ' + e.message);
  }
  return report;
}
