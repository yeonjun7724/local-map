# local-map

일산 호수공원 가족 산책 지도입니다. Next.js App Router + TypeScript + MapLibre + OpenFreeMap을 사용합니다.

## 실행

Node.js 24 이상에서 실행합니다.

```sh
npm ci
npm run dev
```

http://localhost:3000 을 엽니다. 지도는 인터넷 연결과 WebGL이 필요하며 API 키는 필요하지 않습니다. 프로덕션 실행은 `npm run build` 후 `npm start`입니다.

## 구조

```text
data/
  places.csv                 장소·좌표·출처·검증 상태
  routes.json                가족 나들이 3개 코스와 기획 방문 순서
  categories.json            분류 ID·이름·아이콘
config/
  site.ts                    브랜드·지역·지도·기능·언어 설정
lib/data/
  load.ts                    서버 파일 읽기 → 검증 호출
  parse.ts                   CSV/JSON 파싱·검증
  types.ts                   공통 타입
  presentation.ts            좌표 상태 안내 문구
  parse.test.ts              잘못된 데이터 차단 테스트
  filter.ts                  카테고리·장소 검색 순수 함수
  filter.test.ts             검색·필터 조합과 비변경 검증
  route.ts                   방문 순서의 직선 GeoJSON 생성
app/
  page.tsx                   검증 결과를 AtlasApp에 전달
  layout.tsx                 공통 레이아웃
  globals.css                기존 화면 디자인
components/
  AtlasApp.tsx               테마·장소 선택·상세·공유 상태
  PlaceCard.tsx              장소명·분류·설명·주소·좌표 상태 카드
  PlaceDetails.tsx           제공된 상세 정보·이미지·외부 길찾기
  RoutePanel.tsx             한영 코스 안내·정류장 선택·코스 해제
  map/MapView.tsx             받은 장소의 핀·팝업과 지도 표시
tests/unit/                  필터 기본 조합·상세 값 누락 처리 테스트
raw/                         원본 보관
lib/i18n.ts                  코스 패널 한영 문구(route.straightNotice)
map-draft.html               이전 단일 HTML 초안 보관
```

`load.ts`만 서버에서 fs로 파일을 읽습니다. `parse.ts`는 입출력 없는 순수 함수이며 PapaParse로 CSV를 해석하고 Zod로 검증합니다. 잘못된 CSV/JSON, 중복 ID, 없는 분류·장소 참조, 잘못된 좌표는 오류로 처리하고 화면에 넘기지 않습니다. 빌드 시에도 데이터를 검사하므로 원본 오류가 있으면 빌드가 실패합니다. 브라우저에는 검증된 데이터만 전달합니다.

`AtlasApp`은 화면 상태를 관리하고 `MapView`는 전달받은 장소와 선택 상태를 표시합니다. MapView에서 파일을 읽거나 좌표를 보정하지 않습니다. 지도 로딩·오류·재시도와 리사이즈·정리만 내부에서 처리합니다.

카테고리 칩은 `data/categories.json`의 목록에서 생성하며 ‘전체’를 포함합니다. 숫자는 현재 산책 테마의 카테고리별 후보 수입니다. `filterPlaces(places, { category, query })`는 해당 테마 후보에 카테고리와 검색어를 함께 적용합니다. 이름(한·영), 태그, 주소를 대소문자 구분 없이 검색하고 공백으로 나눈 모든 단어가 포함된 장소를 반환합니다. Unicode를 정규화하며 원본 배열·장소는 변경하지 않습니다. 빈 검색어와 `all`은 전체를 뜻합니다. 설명은 검색 대상에 포함하지 않습니다.

검색 결과 중 좌표가 있는 하나의 배열을 카드 목록·지도·‘N곳’ 표시에 그대로 전달합니다. 장소당 카드 하나·핀 하나이므로 개수가 일치합니다. 지도에는 검색 로직이 없으며 결과 배열만 전달합니다. 결과가 없으면 안내와 ‘필터 초기화’를 제공합니다. 좌표가 없는 장소는 결과 수에서 제외하고 별도 ‘좌표 미등록’ 접이식 목록으로 안내합니다. 카테고리 칩 숫자도 지도에 표시 가능한 후보 수입니다.

핀을 선택하면 해당 카드로 스크롤하고 `aria-current`로 강조하며 상세를 엽니다. 카드를 선택하면 지도가 이동하고 같은 상세를 엽니다. 상세에는 설명·주소·영업시간·태그·출처·라이선스 중 값이 있는 항목만 표시합니다. 이미지가 없거나 로딩에 실패하면 카테고리 색 플레이스홀더를 사용합니다. 외부 길찾기는 제공된 좌표만 사용하며 관련 정보 링크와 함께 `target="_blank" rel="noopener noreferrer"`를 지정합니다. 데이터의 빈 값을 채우지 않습니다.

## 데이터 수정

앱의 기준 데이터는 `data/`입니다. 원본 CSV 30개 행과 초안에만 있던 좌표 미등록 후보 14개를 포함합니다. 원본의 메타데이터는 유지했습니다. 코스는 `routes.json`의 `routeId`, `titleKo`, `titleEn`, `descriptionKo`, `descriptionEn`, `theme`, `placeIds`, `transportMode`로 정의합니다. `placeIds`의 순서는 기획 방문 순서이며 실측·검증된 보행 경로를 의미하지 않습니다.

코스는 `lake-scenery-walk`(호수 풍경과 정자 산책), `plants-exhibition-walk`(식물과 전시를 보는 가족 탐방), `park-snack-city-walk`(산책 후 간식과 거리 구경) 3개입니다. 이동 방식은 모두 `walking`입니다. `theme`은 등록된 테마 ID를 참조하며 routeId와 같을 필요는 없습니다. 설명의 약 1.5~2.5시간·2~3시간은 사용자가 제공한 목표 체류 시간으로 보행시간이나 ETA를 계산한 값이 아닙니다.

사용자 승인으로 왕복 코스의 시작점·종료점 중복만 예외로 허용합니다. 두 번째 코스는 공원으로 돌아오는 방문 순서 4회를 그대로 표시하며, 카드·핀은 고유 장소 3곳만 표시합니다. 중간 장소의 중복·없는 장소 ID·미등록 theme·잘못된 routeId·walking 이외 이동 방식은 오류로 처리합니다. 실제 도보 경로·거리·분 단위 ETA를 만들지 않습니다.

코스를 선택하면 `placeIds`의 인접 방문지를 원본 좌표 `[longitude, latitude]`로 직선 연결합니다. 점선과 방문 번호는 순서 이해를 위한 도식이며 실제 길이 아닙니다. `lib/data/route.ts`에서 GeoJSON을 만들고 MapView는 전달된 선만 그립니다. 필터로 숨기거나 좌표가 없는 정류장 양쪽 구간은 끊으며, 남은 장소를 건너 연결하지 않습니다. ‘전체’ 보기에서는 코스 선과 번호가 사라집니다.

같은 좌표의 인접 방문지는 선이 한 점으로 겹치므로 연결선 대신 안내합니다. 현재 두 번째 코스의 모든 시설은 같은 제공 좌표로 등록돼 선이 나타나지 않습니다. 공원 핀에는 재방문 번호 `1·4`를 표시합니다. 시설별 좌표가 보완되면 동일 코드를 통해 왕복 직선이 표시됩니다. 화면상 핀 offset은 선 좌표에 반영하지 않습니다.

코스를 고르면 기존 검색·분류·장소 선택을 해제하고 전체 정류장 좌표로 `fitBounds`합니다. 동일 좌표만 있는 코스도 bounds를 생성하고 최대 확대를 제한합니다. 코스가 선택된 상태에서 화면 크기가 바뀌면 다시 범위를 맞춥니다. 장소 상세를 선택한 동안은 해당 장소로 이동합니다.

코스 패널 상단 안내는 항상 `lib/i18n.ts`의 `route.straightNotice`를 사용합니다. 한국어/English 전환으로 `titleKo/En`, `descriptionKo/En`, CSV의 장소명과 안내 문구를 전환합니다. 정류장 버튼을 누르면 필터를 해제하고 해당 장소 상세를 엽니다. ‘코스 해제’는 검색·분류·상세 선택과 코스 표시를 지우고 전체 지도 30곳 및 지역 기본 중심·줌으로 돌아갑니다. 점선에서 거리나 시간을 산출하지 않습니다.

기본 화면과 `#all`은 좌표가 있는 30곳을 카드 30개·핀 30개로 표시합니다. 좌표 미등록 14곳은 별도 접이식 목록에 보관합니다. 테마를 선택하면 해당 후보만 표시하며 ‘전체’ 버튼으로 돌아올 수 있습니다. 초기 화면은 `region.center`·`region.zoom`을 사용하고 ‘전체 핀 보기’를 누르면 전달된 모든 좌표가 보이도록 범위를 맞춥니다.

여러 장소가 같은 좌표를 공유해도 장소당 버튼 핀 하나씩 표시합니다. 원본 경도·위도는 유지하며 MapLibre Marker의 픽셀 offset으로만 핀 간격을 벌립니다. 이는 화면상 구분용 간격이며, 팝업·범례·접근성 설명에 이를 안내합니다. 개별 시설 위치를 검증하거나 새 좌표를 만든 것이 아닙니다.

핀은 장소명을 `aria-label`로 갖는 HTML 버튼이며 Enter·Space로 선택할 수 있습니다. 핀 색은 선택 전후 모두 카테고리 `color`이고, 선택은 강조 테두리로 구분합니다. 팝업은 장소명과 카테고리를 표시하며 데이터는 `textContent`로만 넣습니다. 지도는 Client Component에서 `next/dynamic({ ssr: false })`로 불러오며 지도 출처 표시는 유지합니다. 스타일 로딩 실패·WebGL 사용 불가 시 ‘지도를 불러오지 못했습니다’와 ‘다시 시도’ 버튼을 표시합니다.

- 위도는 `latitude`, 경도는 `longitude`이며 둘 다 입력하거나 둘 다 비웁니다. 지도 좌표는 `[longitude, latitude]` 순서입니다.
- `coordinateStatus`: `missing`(좌표 없음), `approximate`(근사치), `unverified`(제공됐으나 미검증), `verified`(별도 검증 완료).
- 좌표 미등록 장소는 별도 접이식 목록에 유지하고 마커를 표시하지 않습니다. 애수교는 원본의 근사 좌표를 점선 마커로 표시합니다. 나머지 제공 좌표도 검증 완료로 승격하지 않았습니다.
- 출처·라이선스·운영시간 등 원본 정보를 유지합니다. 빈 값은 임의로 채우지 않습니다.
- CSV의 `category`는 `categories.json`의 `categories[].id`, 비어 있지 않은 `theme`은 `themes[].id`와 일치해야 합니다. 코스의 `theme`도 등록된 테마 ID여야 합니다.
- 지도 시작 위치와 줌은 `config/site.ts`의 `region.center`, `region.zoom`이며, 선택 테마는 URL 해시로 공유합니다. ‘전체 핀 보기’를 누르면 결과의 모든 장소를 포함하도록 범위를 조정합니다.

데이터 변경은 개발 서버에서 새로고침하거나 프로덕션을 다시 빌드해 반영합니다. 보관용 `raw/`와 `map-draft.html`은 앱 변경이 자동 반영되지 않습니다.

## 서비스 설정과 기획안 분류

`config/site.ts`에서 서비스명, 한영 소개, 지역명과 지도 중심점을 수정할 수 있습니다. 초기값은 호수산책, 일산 호수공원 일대이며 중심점은 기존 CSV의 공원 대표 좌표 `[126.76890828, 37.65528473]`, 줌은 15.5입니다. 이 좌표가 개별 시설 위치의 현장 검증을 뜻하지는 않습니다. 스타일은 `map.styleUrl`을 사용하며 빈 값일 때 OpenFreeMap liberty가 기본값입니다. 기존 기능·한국어 기본 설정은 각각 `features`, `languages`로 옮겼습니다.

`data/categories.json`은 `{ "categories": [...], "themes": [...] }` 형식입니다. 분류에는 `id`, `nameKo`, `nameEn`, `color`(`#RRGGBB`), `icon`(Lucide 이름), 테마에는 `id`, `nameKo`, `nameEn`을 넣습니다. 사용하는 아이콘은 `lib/icons.ts`에 명시적으로 등록하며 등록되지 않은 아이콘은 데이터 검사에서 오류로 처리합니다. 색상과 아이콘은 목록과 지도에 반영됩니다.

`raw/planning.md`의 분류 13개·테마 3개를 추가했습니다. 기존 CSV를 유지하기 위해 기존 분류 4개·테마 4개도 함께 등록했습니다. CSV 값을 변경하지 않았으며, 새 분류로 장소를 다시 나누는 작업은 포함하지 않습니다. 기획안 ID만 남길 경우 영향받는 행은 다음과 같습니다(헤더 포함 CSV 행 번호).

| 종류 | 기존 ID | 영향 행 | 건수 |
| --- | --- | --- | ---: |
| category | nature | 2, 7–8, 32–45 | 17 |
| category | landmark | 3–6, 9–14 | 10 |
| category | cafe | 15–25 | 11 |
| category | food | 26–31 | 6 |
| theme | nature-rest | 2, 5–8 | 5 |
| theme | landmark | 3–4, 9–14 | 8 |
| theme | cafe-alley | 15–25 | 11 |
| theme | local-food | 26–31 | 6 |

## 검사

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

지도 출처는 attribution 컨트롤로 유지합니다. 참고: [OpenFreeMap](https://openfreemap.org/quick_start/), [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), [Next.js 서버·클라이언트 컴포넌트](https://nextjs.org/docs/app/getting-started/server-and-client-components).
