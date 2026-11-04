export type Locale = 'ko' | 'en';

export const messages = {
  ko: {
    route: {
      straightNotice: '점선은 방문 순서를 직선으로 연결한 참고용 표시입니다. 실제 도보 경로가 아니며 거리·소요시간을 뜻하지 않습니다.',
      clear: '코스 해제',
      stops: '기획 방문 순서',
      visits: '방문',
      places: '고유 장소',
      revisitNotice: '동일 장소의 재방문은 카드·핀에 중복 표시하지 않습니다.',
      missingNotice: '좌표가 없거나 필터로 숨긴 장소의 구간은 연결하지 않습니다.',
      coincidentNotice: '동일 좌표 구간은 선이 한 점으로 겹칩니다. 시설별 위치 확인이 필요합니다.',
    },
  },
  en: {
    route: {
      straightNotice: 'Dashed lines connect stops in visit order for reference. They are not walking directions and do not represent travel distance or time.',
      clear: 'Clear route',
      stops: 'Planned visit order',
      visits: 'Visits',
      places: 'Unique places',
      revisitNotice: 'Repeat visits to the same place share one card and pin.',
      missingNotice: 'Legs with missing coordinates or filtered-out stops are not connected.',
      coincidentNotice: 'Stops at the same coordinates collapse to a single point. Verify individual facility locations.',
    },
  },
} as const;

export const getMessages = (locale: Locale) => messages[locale];
