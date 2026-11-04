export type Locale = 'ko' | 'en';

export const messages = {
  ko: {
    recommend: {
      title: '나에게 맞는 코스', notice: '추천은 체류시간 가정과 구간당 이동 여유 10분을 사용합니다. 실제 보행시간·운영 여부·동반자 적합성은 방문 전 확인해주세요. 추천 코스의 보행망 경로는 아직 계산되지 않았습니다.',
      time: '이용 시간', theme: '산책 테마', companion: '동반자', start: '출발 장소', any: '전체', center: '지도 중심에서 가까운 곳',
      companions: { solo: '혼자', couple: '연인', friends: '친구', kids: '아이 동반' },
      submit: '코스 추천받기', loading: '추천하는 중…', show: '지도에서 보기', ai: 'AI 추천', rule: '기본 추천',
      noMatch: '조건에 맞는 코스가 없습니다. 시간 안에 3~7곳을 구성할 수 있도록 시간을 늘리거나 테마·출발점을 바꿔주세요.',
      failed: '추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
      customTitle: '나의 추천 코스', customDescription: '추천받은 정류장을 방문 순서대로 표시합니다. 이동 경로·거리는 계산하지 않았습니다.',
    },
    route: {
      straightNotice: '점선은 방문 순서를 직선으로 연결한 참고용 표시입니다. 실제 도보 경로가 아니며 거리·소요시간을 뜻하지 않습니다.',
      networkNotice: 'OpenStreetMap 보행망으로 계산한 경로입니다. 정류장을 가까운 보행망 노드에 연결했으며, 시설 출입구·현장 통행 가능 여부는 미검증입니다.',
      networkReady: '보행망 경로 생성 완료',
      networkPartial: '일부 구간만 생성됐습니다. 미생성 구간이 있어 전체 거리·시간은 계산 불가입니다.',
      networkUnavailable: '이 코스는 경로를 생성하지 못했습니다. 정류장 좌표를 확인해주세요.',
      networkFiltered: '필터로 일부 정류장을 숨겼습니다. 표시 가능한 구간만 그리며 전체 거리·시간은 숨깁니다.',
      distance: '보행망 거리', duration: '추정 이동시간', minutes: '분',
      hours: '시간', seconds: '초', totalDuration: '전체 예상 이동시간',
      notCalculated: '계산 불가', hiddenByFilter: '필터 해제 시 표시',
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
    recommend: {
      title: 'Find my route', notice: 'Recommendations use assumed visit durations plus a 10-minute travel buffer per leg. Verify actual walking times, opening hours, and suitability for your group before visiting. Walking-network paths for recommended routes have not been calculated.',
      time: 'Time available', theme: 'Theme', companion: 'Companions', start: 'Starting place', any: 'Any', center: 'Nearest to the map center',
      companions: { solo: 'Solo', couple: 'Couple', friends: 'Friends', kids: 'With children' },
      submit: 'Get a recommendation', loading: 'Finding a route…', show: 'View on map', ai: 'AI recommendation', rule: 'Default recommendation',
      noMatch: 'No matching route. Increase the time or change the theme or start to fit 3–7 stops within your time limit.',
      failed: 'Could not load a recommendation. Please try again shortly.',
      customTitle: 'My recommended route', customDescription: 'Recommended stops are shown in visit order. Walking paths and distances have not been calculated.',
    },
    route: {
      straightNotice: 'Dashed lines connect stops in visit order for reference. They are not walking directions and do not represent travel distance or time.',
      networkNotice: 'Calculated on the OpenStreetMap walking network. Stops are snapped to nearby network nodes; facility entrances and on-site access have not been verified.',
      networkReady: 'Walking-network route generated',
      networkPartial: 'Only some legs are available. The missing legs prevent a complete distance or duration total.',
      networkUnavailable: 'This route could not be generated. Check the stop coordinates.',
      networkFiltered: 'Some stops are filtered out. Only available legs are shown; route totals are hidden.',
      distance: 'Network distance', duration: 'Estimated moving time', minutes: 'min',
      hours: 'h', seconds: 's', totalDuration: 'Total estimated moving time',
      notCalculated: 'Unavailable', hiddenByFilter: 'Clear filters to show',
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

export function formatDuration(seconds: number | null | undefined, locale: Locale): string {
  const t = getMessages(locale).route;
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return t.notCalculated;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const remainder = total % 60;
  const unit = (value: number, label: string) => locale === 'ko' ? `${value}${label}` : `${value} ${label}`;
  return [hours ? unit(hours, t.hours) : '', minutes ? unit(minutes, t.minutes) : '',
    remainder || total === 0 ? unit(remainder, t.seconds) : ''].filter(Boolean).join(' ');
}
