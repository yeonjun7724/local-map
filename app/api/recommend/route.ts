import { loadAtlasData } from '@/lib/data/load';
import { siteConfig } from '@/config/site';
import { askModel } from '@/lib/recommend/ask';
import { makeCandidates } from '@/lib/recommend/candidates';
import { createRecommender } from '@/lib/recommend/engine';
import { conditionsSchema } from '@/lib/recommend/types';

export const runtime = 'nodejs';
const recommend = createRecommender({ ask: askModel });
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: '입력 크기가 너무 큽니다.' }, { status: 400, headers });
    body = JSON.parse(text);
  } catch { return Response.json({ error: '올바른 JSON 조건이 필요합니다.' }, { status: 400, headers }); }
  const parsed = conditionsSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '추천 조건을 확인해주세요.' }, { status: 400, headers });
  try {
    const data = await loadAtlasData();
    const conditions = parsed.data;
    if ((conditions.theme && !data.themes.some(theme => theme.id === conditions.theme))
      || (conditions.startId && !data.places.some(place => place.id === conditions.startId))) {
      return Response.json({ error: '등록된 테마와 출발 장소만 선택해주세요.' }, { status: 400, headers });
    }
    const candidates = makeCandidates(data, conditions, siteConfig.region.center);
    const result = await recommend(candidates, conditions, siteConfig.region.center);
    if (!result) return Response.json({ error: '선택한 조건으로 시간 안에 3~7곳을 구성할 수 없습니다. 시간을 늘리거나 테마·출발점을 바꿔주세요.' }, { status: 422, headers });
    return Response.json(result, { headers });
  } catch { return Response.json({ error: '추천을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500, headers }); }
}
