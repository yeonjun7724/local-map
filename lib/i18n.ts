export type Locale = 'ko' | 'en';

export const messages = {
  ko: {
    route: {
      straightNotice: '점선은 방문 순서를 직선으로 연결한 참고용 표시입니다. 실제 도보 경로가 아니며 거리·소요시간을 뜻하지 않습니다.',
      networkNotice: 'OpenStreetMap 보행망으로 계산한 경로입니다. 정류장을 가까운 보행망 노드에 연결했으며, 시설 출입구·현장 통행 가능 여부는 미검증입니다.',
      networkReady: '보행망 경로 생성 완료',
      networkPartial: '일부 구간만 생성됐습니다. 미완성 코스의 전체 거리·시간은 표시하지 않습니다.',
      networkUnavailable: '이 코스는 경로를 생성하지 못했습니다. 정류장 좌표를 확인해주세요.',
      networkFiltered: '필터로 일부 정류장을 숨겼습니다. 표시 가능한 구간만 그리며 전체 거리·시간은 숨깁니다.',
      distance: '보행망 거리', duration: '추정 이동시간', minutes: '분',
      speedNotice: '시간은 아래 보행 속도 가정으로 계산한 추정치이며 휴식·신호 대기·관람 시간은 포함하지 않습니다.',
      segments: '구간별 계산 결과',
      reasons: {
        missing_coordinates: '좌표 미등록', coincident_coordinates: '서로 다른 장소의 동일 좌표 — 위치 보완 필요',
        snap_too_far: '보행망 연결점이 너무 멉니다', same_network_node: '같은 보행망 노드에 연결됨 — 개별 위치 확인 필요',
        no_walking_path: '연결되는 보행 경로가 없습니다',
      },
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
      networkNotice: 'Calculated on the OpenStreetMap walking network. Stops are snapped to nearby network nodes; facility entrances and on-site access have not been verified.',
      networkReady: 'Walking-network route generated',
      networkPartial: 'Only some legs are available. Total distance and duration are hidden for incomplete routes.',
      networkUnavailable: 'This route could not be generated. Check the stop coordinates.',
      networkFiltered: 'Some stops are filtered out. Only available legs are shown; route totals are hidden.',
      distance: 'Network distance', duration: 'Estimated moving time', minutes: 'min',
      speedNotice: 'Time uses the walking-speed assumption below and excludes breaks, crossing delays, and visits.',
      segments: 'Leg calculation results',
      reasons: {
        missing_coordinates: 'Missing coordinates', coincident_coordinates: 'Different places share coordinates — update their locations',
        snap_too_far: 'Nearest network node is too far away', same_network_node: 'Same network node — verify individual locations',
        no_walking_path: 'No connecting walking path',
      },
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
