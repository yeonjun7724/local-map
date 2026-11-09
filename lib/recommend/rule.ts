import type { Place } from '../data/types';
import { nearestNeighborOrder } from '../geo';
import type { RecommendationInput } from './schema';

export function recommendByRule(places: readonly Place[], input: RecommendationInput, center: [number, number]) {
  const eligible = places.filter(place => place.latitude !== null && place.longitude !== null
    && (!input.theme || place.theme === input.theme));
  const startPlace = input.startId ? eligible.find(place => place.id === input.startId) : undefined;
  const ordered = nearestNeighborOrder(eligible, startPlace ?? { longitude: center[0], latitude: center[1] });
  const selected: Place[] = [];
  let elapsed = 0;
  for (const place of ordered) {
    const visit = place.recommendedDurationMinutes ?? 30;
    const travel = selected.length ? 10 : 0;
    if (elapsed + visit + travel > input.minutes) continue;
    selected.push(place);
    elapsed += visit + travel;
    if (selected.length === 7) break;
  }
  if (selected.length < Math.min(3, ordered.length)) {
    for (const place of ordered) {
      if (selected.length >= Math.min(3, ordered.length)) break;
      if (selected.some(item => item.id === place.id)) continue;
      selected.push(place);
      elapsed += (selected.length > 1 ? 10 : 0) + (place.recommendedDurationMinutes ?? 30);
    }
  }
  return { placeIds: selected.map(place => place.id), elapsedMinutes: elapsed };
}
