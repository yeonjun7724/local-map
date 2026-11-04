import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel } from '@/lib/data/presentation';
import PlaceIcon from './PlaceIcon';

export default function PlaceCard({ place, selected, onSelect }: {
  place: MapPlace;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return <button type="button" className={'place place-card' + (selected ? ' selected' : '')}
    id={`place-card-${place.id}`} data-place-id={place.id}
    aria-current={selected ? 'true' : undefined} aria-pressed={selected} onClick={() => onSelect(place.id)}>
    <span className="icon" style={{ backgroundColor: place.color + '16' }}><PlaceIcon name={place.icon} color={place.color} /></span>
    <span className="card-content">
      <strong>{place.nameKo}</strong>
      {place.nameEn && <span className="card-english" lang="en">{place.nameEn}</span>}
      <span className="card-category" style={{ color: place.color }}>{place.categoryNameKo}</span>
      <span className="card-description">{place.descriptionKo}</span>
      {place.address && <span className="card-address">{place.address}</span>}
      {place.tags && <span className="card-tags">{place.tags}</span>}
      <small>{coordinateLabel(place)}</small>
    </span>
    <span className="arrow" aria-hidden="true">↗</span>
  </button>;
}
