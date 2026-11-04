import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseAtlasData } from './parse';
import type { AtlasData } from './types';

export async function loadAtlasData(): Promise<AtlasData> {
  const directory = path.join(process.cwd(), 'data');
  const [places, routes, categories] = await Promise.all([
    readFile(path.join(directory, 'places.csv'), 'utf8'),
    readFile(path.join(directory, 'routes.json'), 'utf8'),
    readFile(path.join(directory, 'categories.json'), 'utf8'),
  ]);
  // Fail here before rendering if any source or reference is invalid.
  return parseAtlasData(places, routes, categories);
}
