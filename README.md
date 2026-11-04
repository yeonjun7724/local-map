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
  route-paths.json            OSMnx 보행망 계산 결과·거리·시간·구간 상태
  walking-paths.json          추천용 장소 간 방향별 OSMnx 경로 (서버 전용)
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
  route.ts                   지도 범위 계산·이전 직선 연결 유틸리티
  paths.ts                   보행 경로 검증·지도 GeoJSON 구성
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
lib/i18n.ts                  코스 패널 한영 문구(route.networkNotice)
scripts/generate_route_paths.py  OSMnx 보행망 경로 생성
requirements-routing.txt     Python 경로 생성 의존성
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

사용자 승인으로 왕복 코스의 시작점·종료점 중복만 예외로 허용합니다. 두 번째 코스는 공원으로 돌아오는 방문 순서 4회를 그대로 표시하며, 카드·핀은 고유 장소 3곳만 표시합니다. 중간 장소의 중복·없는 장소 ID·미등록 theme·잘못된 routeId·walking 이외 이동 방식은 오류로 처리합니다.

코스를 선택하면 `route-paths.json`에 저장된 OSM 보행망 구간을 실선으로 표시합니다. 브라우저에서 경로를 계산하거나 직선으로 대체하지 않습니다. `lib/data/paths.ts`가 검증된 구간으로 GeoJSON을 구성하고 MapView는 전달된 선만 그립니다. 필터로 숨긴 장소의 인접 구간은 제외하며 남은 장소를 건너 연결하지 않습니다. ‘전체’ 보기에서는 코스 선과 번호가 사라집니다.

같은 좌표로 등록된 서로 다른 시설은 실제 0m 경로로 간주하지 않습니다. 현재 두 번째 코스 전체와 세 번째 코스의 마지막 구간은 좌표 보완이 필요합니다. 해당 구간의 거리·시간은 `null`, geometry는 빈 배열이며 이유를 안내합니다. 공원 핀에는 재방문 번호 `1·4`를 표시합니다. 화면상 핀 offset은 보행 경로에 반영하지 않습니다.

코스를 고르면 기존 검색·분류·장소 선택을 해제하고 전체 정류장 및 보행망 경로 좌표로 `fitBounds`합니다. 도로 우회 구간도 범위에 포함하며 동일 좌표만 있는 코스는 최대 확대를 제한합니다. 화면 크기가 바뀌면 다시 범위를 맞춥니다. 장소 상세를 선택한 동안은 해당 장소로 이동합니다.

코스 패널 상단 안내는 `lib/i18n.ts`의 `route.networkNotice`를 사용합니다. 한국어/English 전환으로 제목·소개·CSV 장소명·생성 상태·추정치 안내를 전환합니다. 정류장 버튼을 누르면 필터를 해제하고 상세를 엽니다. ‘코스 해제’는 필터·상세·경로를 지우고 전체 지도 30곳 및 지역 기본 중심·줌으로 돌아갑니다. 거리·시간은 직선에서 산출하지 않고 생성 파일의 보행망 결과만 표시합니다.

## OSMnx 보행 경로 생성

Python 3.12 이상에서 프로젝트 루트 기준으로 실행합니다(Windows 예시).

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-routing.txt
.\.venv\Scripts\python.exe scripts/generate_route_paths.py
npm run build
```

OSMnx 2.1.1의 `network_type="walk"`로 정류장 주변 보행망을 다운로드하고, `placeIds` 순서대로 가까운 노드에 연결해 `length` 기준 최단 경로를 계산합니다. 선은 실제 OSM edge geometry를 순서대로 이어 구성합니다. 원본 CSV 좌표와 방문 순서는 바꾸지 않습니다. 원본 지점에서 보행망까지 임의 직선 연결은 추가하지 않습니다. 기본 최대 연결점 거리는 100m이며 초과하면 해당 구간을 실패로 기록합니다. 최근접 노드와 시설 출입구는 다를 수 있고, 실제 통행·유모차 접근 가능 여부는 현장 검증되지 않았습니다.

`data/route-paths.json`은 `generatedAt`, `source`, `license`, `walkingSpeedKmh`, `routes[routeId]`를 담습니다. 코스별 `totalDistanceM`, `totalDurationS`, `segments`, `geometry`에 더해 상태와 입력 좌표 스냅샷을 저장합니다. `ready`는 전체 구간 생성, `partial`은 일부 구간 생성, `unavailable`은 생성 가능 구간 없음입니다. 미완성 코스는 전체 거리·시간과 통합 geometry를 비워 두며, 지도에는 성공한 개별 구간만 표시합니다. 직선 경로로 자동 대체하지 않습니다.

거리는 OSM edge `length`의 합이며 시간은 기본 시속 **4.5km** 가정의 추정 이동시간입니다. 관람·휴식·신호 대기·어린이 보행 차이는 포함하지 않습니다. 기존 코스 소개의 1.5~2.5시간·2~3시간 목표 체류 시간과 별개입니다. `--walking-speed-kmh`로 가정을 바꿀 수 있습니다. 일부 정류장을 필터로 숨겨도 전체 코스 합계를 현재 결과처럼 표시하지 않습니다.

정류장 목록 사이에 `1 → 2`, `2 → 3`, `3 → 4` 구간의 예상 이동시간을 항상 표시합니다. 접이식 메뉴를 열 필요가 없습니다. 상단의 ‘전체 예상 이동시간’은 저장된 `totalDurationS`를 표시하며 초 단위를 유지해 구간별 분 올림으로 합계가 달라지는 문제를 피합니다. 생성 불가 구간과 미완성 코스의 전체 시간은 ‘계산 불가’, 필터 적용 시에는 ‘필터 해제 시 표시’로 구분합니다. 누락 값을 0분으로 채우거나 목표 체류 시간과 합산하지 않습니다.

보행망과 HTTP 캐시는 `.cache/routing/`에 저장하며 Git에 포함하지 않습니다. 최신 OSM 데이터로 다시 만들거나 지역이 바뀌면 `--refresh`를 사용합니다. `--graph`, `--max-snap-m`, `--overpass-url`도 지정할 수 있습니다. 다운로드 또는 생성 도중 예외가 나면 기존 JSON은 유지합니다. CSV 좌표나 코스 순서 변경 시 서버 검증이 오래된 결과를 거부하므로 스크립트 실행 후 다시 빌드해야 합니다.

생성한 데이터는 © OpenStreetMap contributors, **ODbL 1.0**입니다. 패널과 지도에 출처를 유지합니다. 참고: [OSMnx 공식 문서](https://osmnx.readthedocs.io/en/stable/user-reference.html), [OpenStreetMap 저작권·라이선스](https://www.openstreetmap.org/copyright).

Python 생성 로직의 오프라인 검사는 다음과 같습니다.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s scripts -p "test_*.py"
```

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

## 나에게 맞는 코스 추천

화면의 ‘나에게 맞는 코스’에서 이용 시간(60·120·240분), 등록된 테마, 동반자, 좌표가 있는 출발 장소를 라디오로 고릅니다. 결과의 ‘지도에서 보기’는 `useMyRoute().replace(placeIds)`로 이번 세션의 추천 방문 순서를 적용하며, 목록과 지도에 같은 정류장·번호를 표시합니다. 추천 순서의 OSMnx 보행망 경로를 실선으로 연결하고, 경로를 포함해 지도 범위를 맞춥니다. 패널에는 구간별 추정 이동시간, 전체 거리·이동시간, 보행 속도 가정과 출처를 표시합니다. 코스 해제로 전체 지도에 돌아갑니다. 추천 코스는 새로고침하면 유지되지 않으며 공유 링크를 만들지 않습니다.

`POST /api/route-path`에 `{ placeIds: string[] }`(중복 없는 등록 장소 3~7곳)를 전달하면 해당 순서의 경로와 메타데이터만 반환합니다. 서버는 `data/walking-paths.json`의 방향별 OSMnx 경로를 읽고 CSV 좌표와 순서를 검증합니다. 전체 경로표는 클라이언트에 보내지 않으며, 요청마다 Python이나 외부 길찾기 서비스를 실행하지 않습니다. 아래 명령으로 좌표가 있는 모든 장소 사이의 양방향 경로를 생성합니다(현재 30곳·870쌍). 각 방향을 따로 계산하며 역방향 경로를 임의로 뒤집지 않습니다.

```powershell
.\.venv\Scripts\python.exe scripts/generate_route_paths.py --pairs
```

장소 추가·좌표 수정 후에는 위 명령을 다시 실행합니다. 보행망 범위까지 갱신하려면 `--pairs --refresh`를 사용합니다. 기획 코스용 `route-paths.json`은 기존 생성 명령으로 별도 갱신합니다. 추천 구간도 최대 연결점 거리 100m 등 기존 기준을 동일하게 사용합니다. 동일 좌표·연결 불가 구간에는 선이나 0분을 만들지 않으며, 가능한 구간만 표시하고 미완성 코스의 전체 거리·시간은 ‘계산 불가’로 안내합니다. 요청 실패 시 정류장은 유지하고 ‘경로 다시 시도’를 제공합니다. 다른 추천이나 코스 해제로 전환하면 이전 요청을 취소하고 늦은 응답이 현재 경로를 덮어쓰지 않도록 합니다. 추천 시간 조건의 10분 이동 여유와 OSM 보행망 추정 이동시간은 서로 다른 가정이며, 경로 표시는 추천 순서를 바꾸지 않습니다.

Qwen 사용 시 `.env.example`을 참고해 서버 환경의 `AI_API_KEY`, `AI_MODEL`(Qwen 모델 ID), `AI_BASE_URL`을 설정합니다. 기본 URL은 `https://openrouter.ai/api/v1`이며 `/chat/completions`를 호출합니다. 키·모델·URL은 서버에서만 읽습니다. 클라이언트에는 추천 ID·이유·출처만 응답합니다. 키나 모델이 없으면 기본 추천을 사용합니다.

`POST /api/recommend` 입력은 `{ minutes: 60 | 120 | 240, theme: string | null, companion: 'solo' | 'couple' | 'friends' | 'kids', startId: string | null }`입니다. 테마·출발 ID는 서버 데이터로 검사하고 후보는 서버에서 최대 30곳을 만듭니다. 장소 자체 테마와 기획 코스의 테마를 함께 참고하되 좌표 미등록 장소는 제외합니다. AI 응답은 후보 ID, 중복 없는 3~7곳, 지정 출발점, 시간 한도를 검사하며 실패한 응답을 수정하지 않습니다.

키 없음, 8초 타임아웃, 응답 검사 실패, 프로세스 전체의 분당 20회 초과 요청은 규칙 기반으로 대체합니다. 동일 조건의 성공 결과는 1시간 동안 메모리에 보관하고 같은 요청의 동시 모델 호출은 합칩니다. 캐시는 최대 500개이며 재시작하면 사라집니다. 여러 서버 인스턴스 간에 캐시·요청 횟수는 공유되지 않습니다.

규칙 기반은 테마와 출발점부터 가까운 장소 순서를 사용합니다. 권장 체류시간 미등록 시 30분, 구간마다 이동 여유 10분으로 한도 안에 드는 3~7곳만 제공합니다. 이 시간은 실제 보행시간 계산이 아닙니다. 현재 44곳 모두 체류시간이 비어 있어 최소 3곳에 110분이 필요하므로 60분은 HTTP 422 ‘조건에 맞는 코스 없음’을 반환합니다. 시간을 줄이거나 장소를 임의로 추가하지 않습니다. 좌표가 없는 출발점 등 구성 불가능한 조건도 422, 잘못된 입력은 400입니다.

## 검사

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

지도 출처는 attribution 컨트롤로 유지합니다. 참고: [OpenFreeMap](https://openfreemap.org/quick_start/), [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), [Next.js 서버·클라이언트 컴포넌트](https://nextjs.org/docs/app/getting-started/server-and-client-components).
