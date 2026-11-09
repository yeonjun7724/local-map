import 'server-only';
import OpenAI from 'openai';
import type { Place, Theme } from '../data/types';
import { recommendationPrompt } from './prompt';
import { parseRecommendationResponse, type RecommendationInput } from './schema';

export async function askModel(places: readonly Place[], themes: readonly Theme[], input: RecommendationInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const candidates = places.map(place => ({
    id: place.id,
    name: place.nameKo,
    category: place.category,
    tags: place.tags,
    recommendedMinutes: place.recommendedDurationMinutes ?? 30,
    coordinates: [place.longitude, place.latitude],
  }));
  const themeName = themes.find(theme => theme.id === input.theme)?.nameKo ?? null;
  const companionLabels = { solo: '혼자', couple: '연인 또는 둘이서', friends: '친구', kids: '아이 동반 가족' };
  try {
    const client = new OpenAI({ apiKey, timeout: 8000, maxRetries: 0 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        { role: 'system', content: recommendationPrompt },
        { role: 'user', content: JSON.stringify({ conditions: { minutes: input.minutes, theme: themeName, companion: companionLabels[input.companion], startId: input.startId }, candidates }) },
      ],
      text: { format: { type: 'json_schema', name: 'walking_route_recommendation', strict: true,
        schema: { type: 'object', properties: { placeIds: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } }, required: ['placeIds', 'reason'], additionalProperties: false } } },
    });
    if (!response.output_text) return null;
    return parseRecommendationResponse(response.output_text, candidates.map(candidate => candidate.id));
  } catch {
    return null;
  }
}
