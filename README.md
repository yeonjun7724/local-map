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
lib/data/
  load.ts                    서버 파일 읽기 → 검증 호출
  parse.ts                   CSV/JSON 파싱·검증
  types.ts                   공통 타입
  presentation.ts            좌표 상태 안내 문구
  parse.test.ts              잘못된 데이터 차단 테스트
app/
  page.tsx                   검증 결과를 AtlasApp에 전달
  layout.tsx                 공통 레이아웃
  globals.css                기존 화면 디자인
components/
  AtlasApp.tsx               테마·장소 선택·상세·공유 상태
  map/MapView.tsx             받은 장소의 핀·팝업과 지도 표시
raw/                         원본 보관
map-draft.html               이전 단일 HTML 초안 보관
```

`load.ts`만 서버에서 파일을 읽습니다. 잘못된 CSV/JSON, 중복 ID, 없는 분류·장소 참조, 잘못된 좌표는 `parse.ts`에서 오류로 처리하고 화면에 넘기지 않습니다. 빌드 시에도 데이터를 검사하므로 원본 오류가 있으면 빌드가 실패합니다. 브라우저에는 검증된 데이터만 전달합니다.

`AtlasApp`은 화면 상태를 관리하고 `MapView`는 전달받은 장소와 선택 상태를 표시합니다. MapView에서 파일을 읽거나 좌표를 보정하지 않습니다. 지도 로딩·오류·재시도와 리사이즈·정리만 내부에서 처리합니다.

## 데이터 수정

앱의 기준 데이터는 `data/`입니다. 원본 CSV 30개 행과 초안에만 있던 좌표 미등록 후보 14개를 포함합니다. 원본의 메타데이터는 유지했습니다. 테마의 후보 목록은 `routes.json`의 `stops[].placeId`로 지정합니다. 후보는 검증된 방문 순서나 보행 경로가 아닙니다.

기본 화면과 `#all`은 전체 44개 장소를 목록에 표시하며, 좌표가 있는 30곳을 모두 지도에 전달합니다. 테마를 선택하면 해당 후보만 표시하며 ‘전체’ 버튼으로 돌아올 수 있습니다. 전체 보기에서는 모든 좌표가 보이도록 지도 범위를 맞춥니다.

여러 장소가 같은 좌표를 공유하면 좌표를 임의로 옮기지 않고 숫자 핀 하나로 묶습니다. 숫자 핀을 누르면 팝업에서 각 장소를 선택할 수 있습니다. 이는 원본 데이터의 동일 좌표를 묶는 기능이며, 각 시설의 정확한 개별 위치가 검증됐다는 뜻은 아닙니다.

- 위도는 `latitude`, 경도는 `longitude`이며 둘 다 입력하거나 둘 다 비웁니다. 지도 좌표는 `[longitude, latitude]` 순서입니다.
- `coordinateStatus`: `missing`(좌표 없음), `approximate`(근사치), `unverified`(제공됐으나 미검증), `verified`(별도 검증 완료).
- 좌표 미등록 장소는 목록에 유지하고 마커를 표시하지 않습니다. 애수교는 원본의 근사 좌표를 점선 마커로 표시합니다. 나머지 제공 좌표도 검증 완료로 승격하지 않았습니다.
- 출처·라이선스·운영시간 등 원본 정보를 유지합니다. 빈 값은 임의로 채우지 않습니다.
- CSV의 `category`와 `categories.json`의 ID, 테마의 장소 ID가 일치해야 합니다.
- 지도 시작 위치는 `ilsan-lake-park` 행의 제공 좌표이며, 선택 테마는 URL 해시로 공유합니다.

데이터 변경은 개발 서버에서 새로고침하거나 프로덕션을 다시 빌드해 반영합니다. 보관용 `raw/`와 `map-draft.html`은 앱 변경이 자동 반영되지 않습니다.

## 검사

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

지도 출처는 attribution 컨트롤로 유지합니다. 참고: [OpenFreeMap](https://openfreemap.org/quick_start/), [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), [Next.js 서버·클라이언트 컴포넌트](https://nextjs.org/docs/app/getting-started/server-and-client-components).
