import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel } from '@/lib/data/presentation';
import PlaceIcon from './PlaceIcon';
import type { Locale } from '@/lib/i18n';

export default function PlaceCard({ place, locale, categoryName, selected, onSelect }: {
  place: MapPlace;
  locale: Locale;
  categoryName: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return <button type="button" className={'place place-card' + (selected ? ' selected' : '')}
    id={`place-card-${place.id}`} data-place-id={place.id}
    aria-current={selected ? 'true' : undefined} aria-pressed={selected} onClick={() => onSelect(place.id)}>
    <span className="icon" style={{ backgroundColor: place.color + '16' }}><PlaceIcon name={place.icon} color={place.color} /></span>
    <span className="card-content">
      <strong>{locale === 'en' ? place.nameEn || place.nameKo : place.nameKo}</strong>
      {locale === 'en' && place.nameEn && place.nameKo !== place.nameEn && <span className="card-korean" lang="ko">{place.nameKo}</span>}
      <span className="card-category" style={{ color: place.color }}>{categoryName}</span>
      <span className="card-description">{locale === 'en' ? place.descriptionEn || place.descriptionKo : place.descriptionKo}</span>
      {place.address && <span className="card-address">{place.address}</span>}
      {place.tags && <span className="card-tags">{place.tags}</span>}
      <small>{coordinateLabel(place)}</small>
    </span>
    <span className="arrow" aria-hidden="true">↗</span>
  </button>;
}
