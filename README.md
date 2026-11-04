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
  routes.json                기존 3개 테마와 후보 장소 ID
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
app/
  page.tsx                   검증 결과를 AtlasApp에 전달
  layout.tsx                 공통 레이아웃
  globals.css                기존 화면 디자인
components/
  AtlasApp.tsx               테마·장소 선택·상세·공유 상태
  PlaceCard.tsx              장소명·분류·설명·주소·좌표 상태 카드
  map/MapView.tsx             받은 장소의 핀·팝업과 지도 표시
raw/                         원본 보관
map-draft.html               이전 단일 HTML 초안 보관
```

`load.ts`만 서버에서 fs로 파일을 읽습니다. `parse.ts`는 입출력 없는 순수 함수이며 PapaParse로 CSV를 해석하고 Zod로 검증합니다. 잘못된 CSV/JSON, 중복 ID, 없는 분류·장소 참조, 잘못된 좌표는 오류로 처리하고 화면에 넘기지 않습니다. 빌드 시에도 데이터를 검사하므로 원본 오류가 있으면 빌드가 실패합니다. 브라우저에는 검증된 데이터만 전달합니다.

`AtlasApp`은 화면 상태를 관리하고 `MapView`는 전달받은 장소와 선택 상태를 표시합니다. MapView에서 파일을 읽거나 좌표를 보정하지 않습니다. 지도 로딩·오류·재시도와 리사이즈·정리만 내부에서 처리합니다.

카테고리 칩은 `data/categories.json`의 목록에서 생성하며 ‘전체’를 포함합니다. 숫자는 현재 산책 테마의 카테고리별 후보 수입니다. `filterPlaces(places, { category, query })`는 해당 테마 후보에 카테고리와 검색어를 함께 적용합니다. 이름(한·영), 태그, 주소를 대소문자 구분 없이 검색하고 공백으로 나눈 모든 단어가 포함된 장소를 반환합니다. Unicode를 정규화하며 원본 배열·장소는 변경하지 않습니다. 빈 검색어와 `all`은 전체를 뜻합니다. 설명은 검색 대상에 포함하지 않습니다.

검색 결과는 카드 목록과 지도에 동시에 반영됩니다. 지도에는 검색 로직이 없으며 필터링된 배열만 전달합니다. 결과가 없으면 안내와 초기화 버튼을 제공하고, 좌표가 없는 장소도 카드로 확인할 수 있습니다.

## 데이터 수정

앱의 기준 데이터는 `data/`입니다. 원본 CSV 30개 행과 초안에만 있던 좌표 미등록 후보 14개를 포함합니다. 원본의 메타데이터는 유지했습니다. 테마의 후보 목록은 `routes.json`의 `stops[].placeId`로 지정합니다. 후보는 검증된 방문 순서나 보행 경로가 아닙니다.

기본 화면과 `#all`은 전체 44개 장소를 목록에 표시하며, 좌표가 있는 30곳을 모두 지도에 전달합니다. 테마를 선택하면 해당 후보만 표시하며 ‘전체’ 버튼으로 돌아올 수 있습니다. 초기 화면은 `region.center`·`region.zoom`을 사용하고 ‘전체 핀 보기’를 누르면 전달된 모든 좌표가 보이도록 범위를 맞춥니다.

여러 장소가 같은 좌표를 공유하면 좌표를 임의로 옮기지 않고 숫자 핀 하나로 묶습니다. 숫자 핀을 누르면 팝업에서 각 장소를 선택할 수 있습니다. 이는 원본 데이터의 동일 좌표를 묶는 기능이며, 각 시설의 정확한 개별 위치가 검증됐다는 뜻은 아닙니다.

핀은 장소명을 `aria-label`로 갖는 HTML 버튼이며 Enter·Space로 선택할 수 있습니다. 핀 색은 선택 전후 모두 카테고리 `color`이고, 선택은 강조 테두리로 구분합니다. 팝업은 장소명과 카테고리를 표시하며 데이터는 `textContent`로만 넣습니다. 지도는 Client Component에서 `next/dynamic({ ssr: false })`로 불러오며 지도 출처 표시는 유지합니다. 스타일 로딩 실패·WebGL 사용 불가 시 ‘지도를 불러오지 못했습니다’와 ‘다시 시도’ 버튼을 표시합니다.

- 위도는 `latitude`, 경도는 `longitude`이며 둘 다 입력하거나 둘 다 비웁니다. 지도 좌표는 `[longitude, latitude]` 순서입니다.
- `coordinateStatus`: `missing`(좌표 없음), `approximate`(근사치), `unverified`(제공됐으나 미검증), `verified`(별도 검증 완료).
- 좌표 미등록 장소는 목록에 유지하고 마커를 표시하지 않습니다. 애수교는 원본의 근사 좌표를 점선 마커로 표시합니다. 나머지 제공 좌표도 검증 완료로 승격하지 않았습니다.
- 출처·라이선스·운영시간 등 원본 정보를 유지합니다. 빈 값은 임의로 채우지 않습니다.
- CSV의 `category`는 `categories.json`의 `categories[].id`, 비어 있지 않은 `theme`은 `themes[].id`와 일치해야 합니다. 코스 ID도 등록된 theme ID여야 합니다.
- 지도 시작 위치와 줌은 `config/site.ts`의 `region.center`, `region.zoom`이며, 선택 테마는 URL 해시로 공유합니다. 전체 보기에서는 모든 장소를 포함하도록 범위를 조정합니다.

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
