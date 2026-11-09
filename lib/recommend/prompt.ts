const visitorPersona = '아이와 일산호수공원 주변을 함께 걷는 가족';
const neighborhoodMood = '호수와 정원, 산책길이 어우러진 차분하고 여유로운 동네';

export const recommendationPrompt = [
  '후보 목록 밖 장소 금지: placeIds에는 제공된 후보 목록에 있는 id만 사용하세요.',
  '3~7곳: 조건에 맞는 장소를 방문 순서로 3곳 이상 7곳 이하 선택하세요.',
  'JSON 만 출력: 지정된 JSON 형식의 placeIds와 reason만 반환하세요.',
  '산책 시간, 테마, 동행 유형, 출발 장소 조건에 맞게 후보를 고르세요.',
  `reason 문장의 말투만 방문객 페르소나(${visitorPersona})와 동네 분위기(${neighborhoodMood})에 맞추세요. 장소 선택, 방문 순서, 사실 정보, 앞의 후보·개수·JSON 규칙은 바꾸지 마세요.`,
].join('\n');
