import type { Place } from './types';

export function coordinateLabel(place: Place) {
  switch (place.coordinateStatus) {
    case 'missing': return '좌표 미등록 · 지도 표시 없음';
    case 'approximate': return '근사 좌표 · 현장 확인 필요';
    case 'verified': return '검증된 좌표 · 운영 정보 확인 필요';
    default: return '제공 좌표 · 현장 확인 필요';
  }
}
