import 'server-only';
import { parseModelText } from './validate';
import type { Candidate, Conditions } from './types';
import { recommendationPrompt } from './prompt';

export async function askModel(candidates: readonly Candidate[], conditions: Conditions): Promise<unknown | null> {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const base = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  if (!key || !model || !/qwen/i.test(model)) return null;
  try {
    const url = new URL(base.replace(/\/+$/, '') + '/chat/completions');
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const response = await fetch(url, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'error',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, stream: false, temperature: 0.2, max_tokens: 800,
        messages: [
          { role: 'system', content: recommendationPrompt },
          { role: 'user', content: JSON.stringify({ conditions, candidates: candidates.map(place => ({
            id: place.id, name: place.nameKo, category: place.category, tags: place.tags,
            recommendedMinutes: place.recommendedDurationMinutes ?? 30,
            coordinates: [place.longitude, place.latitude],
          })) }) },
        ],
      }),
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (raw.length > 65536) return null;
    const envelope = JSON.parse(raw);
    const content = envelope?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? parseModelText(content) : null;
  } catch { return null; } // Never log provider errors, headers, or credentials.
}
