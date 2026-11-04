import type { ParsedPlace, ParsedCategory, ParsedRoute, ParsedTheme } from './parse';

export type Place = ParsedPlace;
export type Category = ParsedCategory;
export type Route = ParsedRoute;
export type Theme = ParsedTheme;
export type AtlasData = { places: Place[]; routes: Route[]; categories: Category[]; themes: Theme[] };
export type MapPlace = Place & { icon: string; color: string; categoryNameKo: string };
