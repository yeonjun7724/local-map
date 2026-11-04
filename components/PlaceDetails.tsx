'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel } from '@/lib/data/presentation';
import PlaceIcon from './PlaceIcon';

export default function PlaceDetails({ place, onClose, onShare }: {
  place: MapPlace;
  onClose: () => void;
  onShare?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  // Generate directions only from supplied coordinates, never a guessed location.
  const directions = place.latitude !== null && place.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`
    : null;
  return <section className="detail" aria-labelledby="placeTitle">
    <button type="button" className="detail-close" onClick={onClose} aria-label="장소 상세 닫기">×</button>
    {place.imageUrl && !imageFailed
      ? <Image className="detail-image" src={place.imageUrl} alt={place.nameKo} width={640} height={300} unoptimized onError={() => setImageFailed(true)} />
      : <div className="detail-placeholder" style={{ backgroundColor: place.color }} role="img" aria-label={`${place.categoryNameKo} 이미지 자리표시자`}>
        <PlaceIcon name={place.icon} color="#ffffff" />
      </div>}
    <span className="detail-category" style={{ color: place.color }}>{place.categoryNameKo}</span>
    <h3 id="placeTitle">{place.nameKo}</h3>
    {place.descriptionKo && <p className="detail-description">{place.descriptionKo}</p>}
    <dl className="detail-fields">
      {place.address && <div><dt>주소</dt><dd>{place.address}</dd></div>}
      {place.openingHours && <div><dt>영업시간</dt><dd>{place.openingHours}</dd></div>}
      {place.tags && <div><dt>태그</dt><dd>{place.tags}</dd></div>}
      {place.source && <div><dt>출처</dt><dd>{place.source}</dd></div>}
      {place.license && <div><dt>라이선스</dt><dd>{place.license}</dd></div>}
    </dl>
    <span className="tag" id="coordinateStatus">{coordinateLabel(place)}</span>
    <div className="detail-links">
      {directions && <a href={directions} target="_blank" rel="noopener noreferrer">외부 길찾기 ↗</a>}
      {place.externalUrl && <a href={place.externalUrl} target="_blank" rel="noopener noreferrer">관련 정보 ↗</a>}
    </div>
    {onShare && <button type="button" onClick={onShare}>이 보기의 링크 복사 ↗</button>}
  </section>;
}
