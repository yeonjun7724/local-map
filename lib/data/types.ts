import type { ParsedPlace, ParsedCategory, ParsedRoute } from './parse';

export type Place = ParsedPlace;
export type Category = ParsedCategory;
export type Route = ParsedRoute;
export type AtlasData = { places: Place[]; routes: Route[]; categories: Category[] };
export type MapPlace = Place & { icon: string };
