import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { categoryIcons } from '../icons';

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '영문 소문자·숫자·하이픈 ID가 필요합니다');
const required = z.string().trim().min(1);
const optionalText = z.string().trim();
const coordinate = (min: number, max: number) => z.string().trim()
  .transform(value => value === '' ? null : Number(value))
  .pipe(z.number().finite().min(min).max(max).nullable());
const optionalUrl = z.union([z.literal(''), z.url().refine(value => /^https?:\/\//.test(value))]);

const placeSchema = z.object({
  id,
  nameKo: required,
  nameEn: optionalText,
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  coordinateStatus: z.enum(['missing', 'approximate', 'unverified', 'verified']),
  category: id,
  theme: optionalText,
  descriptionKo: required,
  descriptionEn: optionalText,
  address: optionalText,
  imageUrl: optionalUrl,
  source: required,
  license: optionalText,
  openingHours: optionalText,
  tags: optionalText,
  externalUrl: optionalUrl,
  recommendedDurationMinutes: z.string().trim()
    .transform(value => value === '' ? null : Number(value))
    .pipe(z.number().finite().positive().nullable()),
  updatedAt: z.union([z.literal(''), z.iso.date()]),
  isSample: z.enum(['TRUE', 'FALSE']).transform(value => value === 'TRUE'),
}).strict().superRefine((place, ctx) => {
  if ((place.latitude === null) !== (place.longitude === null)) {
    ctx.addIssue({ code: 'custom', message: '위도·경도는 함께 입력하거나 함께 비워야 합니다' });
  }
  const missing = place.latitude === null && place.longitude === null;
  if ((place.coordinateStatus === 'missing') !== missing) {
    ctx.addIssue({ code: 'custom', message: 'coordinateStatus와 좌표 유무가 일치하지 않습니다' });
  }
});

const categorySchema = z.object({
  id,
  nameKo: required,
  nameEn: required,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '#RRGGBB 색상이 필요합니다'),
  icon: required.refine(value => Object.hasOwn(categoryIcons, value), '지원하는 Lucide 아이콘 이름이 필요합니다'),
}).strict();
const themeSchema = z.object({ id, nameKo: required, nameEn: required }).strict();
const routeSchema = z.object({
  id,
  label: required,
  title: required,
  description: required,
  durationLabel: required,
  // These are candidates, not an ordered or verified walking path.
  stops: z.array(z.object({ placeId: id, description: required, icon: required }).strict()).min(1),
}).strict();

export type ParsedPlace = z.infer<typeof placeSchema>;
export type ParsedCategory = z.infer<typeof categorySchema>;
export type ParsedRoute = z.infer<typeof routeSchema>;
export type ParsedTheme = z.infer<typeof themeSchema>;

function assertUnique(ids: string[], context: string) {
  const seen = new Set<string>();
  for (const value of ids) {
    if (seen.has(value)) throw new Error(`${context}: 중복 ID '${value}'`);
    seen.add(value);
  }
}

export function parsePlaces(csv: string): ParsedPlace[] {
  let headers: string[] = [];
  const rows: unknown[] = parse(csv, {
    bom: true,
    columns: (names: string[]) => {
      headers = names;
      assertUnique(names, 'places.csv 헤더');
      return names;
    },
    skip_empty_lines: true,
    trim: true,
  });
  const expected = Object.keys(placeSchema.shape);
  if (headers.length !== expected.length || expected.some(key => !headers.includes(key))) {
    throw new Error(`places.csv: 헤더를 확인해주세요. 필수 열: ${expected.join(', ')}`);
  }
  if (rows.length === 0) throw new Error('places.csv: 장소가 없습니다');
  const places = rows.map((row, index) => {
    const result = placeSchema.safeParse(row);
    if (!result.success) {
      throw new Error(`places.csv 레코드 ${index + 1}: ${result.error.message}`);
    }
    return result.data;
  });
  assertUnique(places.map(place => place.id), 'places.csv');
  return places;
}

function readJson(text: string, filename: string): unknown {
  try { return JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { throw new Error(`${filename}: 올바른 JSON이 아닙니다`); }
}

export function parseAtlasData(csv: string, routesJson: string, categoriesJson: string) {
  const places = parsePlaces(csv);
  const { categories, themes } = z.object({
    categories: z.array(categorySchema).min(1),
    themes: z.array(themeSchema).min(1),
  }).strict().parse(readJson(categoriesJson, 'categories.json'));
  const routes = z.array(routeSchema).min(1).parse(readJson(routesJson, 'routes.json'));
  assertUnique(categories.map(category => category.id), 'categories.json');
  assertUnique(themes.map(theme => theme.id), 'categories.json themes');
  assertUnique(routes.map(route => route.id), 'routes.json');
  const categoryIds = new Set(categories.map(category => category.id));
  const placeIds = new Set(places.map(place => place.id));
  const themeIds = new Set(themes.map(theme => theme.id));
  for (const place of places) {
    if (!categoryIds.has(place.category)) {
      throw new Error(`places.csv '${place.id}': 미등록 category '${place.category}'`);
    }
    if (place.theme && !themeIds.has(place.theme)) {
      throw new Error(`places.csv '${place.id}': 미등록 theme '${place.theme}'`);
    }
  }
  for (const route of routes) {
    if (!themeIds.has(route.id)) {
      throw new Error(`routes.json '${route.id}': 미등록 theme`);
    }
    assertUnique(route.stops.map(stop => stop.placeId), `routes.json '${route.id}' 후보`);
    for (const stop of route.stops) {
      if (!placeIds.has(stop.placeId)) {
        throw new Error(`routes.json '${route.id}': 없는 장소 '${stop.placeId}'`);
      }
    }
  }
  return { places, routes, categories, themes };
}
