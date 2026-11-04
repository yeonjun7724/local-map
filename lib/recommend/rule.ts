import { nearestNeighborOrder, type LngLat } from '../geo';
import { estimatedMinutes, type Candidate, type Conditions, type Recommendation } from './types';

export function recommendByRule(candidates: readonly Candidate[], conditions: Conditions, center: LngLat): Recommendation | null {
  const matching = conditions.theme ? candidates.filter(place => place.recommendThemes.includes(conditions.theme!)) : [];
  const pool = matching.length ? [...matching] : [...candidates];
  if (conditions.startId) {
    const start = candidates.find(place => place.id === conditions.startId);
    if (!start) return null;
    if (!pool.some(place => place.id === start.id)) pool.unshift(start);
  }
  const ordered = nearestNeighborOrder(pool, conditions.startId, center);
  const selected: Candidate[] = [];
  for (const place of ordered) {
    if (estimatedMinutes([...selected, place]) <= conditions.minutes) selected.push(place);
    else if (place.id === conditions.startId && selected.length === 0) return null;
    if (selected.length === 7) break;
  }
  if (selected.length < 3) return null;
  return {
    placeIds: selected.map(place => place.id),
    reason: `가까운 장소 순서와 체류시간 가정(미등록 시 30분), 구간당 이동 여유 10분으로 ${conditions.minutes}분 안에 맞춘 기본 추천입니다. 운영 여부와 동반자 적합성은 방문 전 확인해주세요.`,
  };
}
