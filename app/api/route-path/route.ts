import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { loadAtlasData } from '@/lib/data/load';
import { buildRecommendedNetworkRoute, parseRouteConnections } from '@/lib/data/paths';

export const runtime = 'nodejs';

const requestSchema = z.object({ placeIds: z.array(z.string()).min(2).max(7) }).strict()
  .refine(value => new Set(value.placeIds).size === value.placeIds.length);

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid place IDs' }, { status: 400 });

  const atlas = await loadAtlasData();
  const ids = new Set(atlas.places.map(place => place.id));
  if (parsed.data.placeIds.some(id => !ids.has(id))) return Response.json({ error: 'Unknown place ID' }, { status: 400 });
  const text = await readFile(path.join(process.cwd(), 'data', 'route-connections.json'), 'utf8');
  const connections = parseRouteConnections(text, atlas.places);
  return Response.json(buildRecommendedNetworkRoute(parsed.data.placeIds, connections));
}
