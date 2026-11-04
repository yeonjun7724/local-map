import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAtlasData } from '@/lib/data/load';
import { assembleWalkingRoute, walkingRequestSchema } from '@/lib/data/walking';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: '잘못된 정류장 목록입니다.' }, { status: 400, headers });
    body = JSON.parse(text);
  } catch { return Response.json({ error: '올바른 JSON 목록이 필요합니다.' }, { status: 400, headers }); }
  const parsed = walkingRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: '중복 없는 정류장 3~7곳이 필요합니다.' }, { status: 400, headers });
  try {
    const data = await loadAtlasData();
    const places = new Map(data.places.map(place => [place.id, place]));
    if (parsed.data.placeIds.some(id => !places.has(id))) return Response.json({ error: '등록된 장소만 사용할 수 있습니다.' }, { status: 400, headers });
    if (parsed.data.placeIds.some(id => places.get(id)!.longitude === null || places.get(id)!.latitude === null)) {
      return Response.json({ error: '좌표가 없는 장소가 있습니다.' }, { status: 422, headers });
    }
    const pairs = JSON.parse(await readFile(path.join(process.cwd(), 'data/walking-paths.json'), 'utf8'));
    return Response.json(assembleWalkingRoute(pairs, parsed.data.placeIds, data.places), { headers });
  } catch { return Response.json({ error: '보행 경로를 불러오지 못했습니다. 경로 데이터를 확인하거나 다시 시도해주세요.' }, { status: 503, headers }); }
}
