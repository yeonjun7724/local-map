'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { MapPlace } from '@/lib/data/types';
import { coordinateLabel } from '@/lib/data/presentation';
import type { Locale } from '@/lib/i18n';
import PlaceIcon from './PlaceIcon';

export default function PlaceDetails({ place, onClose, onShare, locale = 'ko', categoryName = place.categoryNameKo }: {
  place: MapPlace;
  onClose: () => void;
  onShare?: () => void;
  locale?: Locale;
  categoryName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = locale === 'en' ? place.nameEn || place.nameKo : place.nameKo;
  const description = locale === 'en' ? place.descriptionEn || place.descriptionKo : place.descriptionKo;
  const directions = place.latitude !== null && place.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`
    : null;
  return <section className="detail" aria-labelledby="placeTitle" lang={locale}>
    <button type="button" className="detail-close" onClick={onClose} aria-label={locale === 'ko' ? '장소 상세 닫기' : 'Close place details'}>×</button>
    {place.imageUrl && !imageFailed
      ? <Image className="detail-image" src={place.imageUrl} alt={name} width={640} height={300} unoptimized onError={() => setImageFailed(true)} />
      : <div className="detail-placeholder" style={{ backgroundColor: place.color }} role="img" aria-label={`${categoryName} ${locale === 'ko' ? '이미지 자리표시자' : 'image placeholder'}`}>
        <PlaceIcon name={place.icon} color="#ffffff" />
      </div>}
    <span className="detail-category" style={{ color: place.color }}>{categoryName}</span>
    <h3 id="placeTitle">{name}</h3>
    {locale === 'en' && place.nameEn && <p className="card-korean" lang="ko">{place.nameKo}</p>}
    {description && <p className="detail-description">{description}</p>}
    <dl className="detail-fields">
      {place.address && <div><dt>{locale === 'ko' ? '주소' : 'Address'}</dt><dd>{place.address}</dd></div>}
      {place.openingHours && <div><dt>{locale === 'ko' ? '운영 정보' : 'Opening information'}</dt><dd>{place.openingHours}</dd></div>}
      {place.tags && <div><dt>{locale === 'ko' ? '태그' : 'Tags'}</dt><dd>{place.tags}</dd></div>}
      {place.source && <div><dt>{locale === 'ko' ? '출처' : 'Source'}</dt><dd>{place.source}</dd></div>}
      {place.license && <div><dt>{locale === 'ko' ? '라이선스' : 'License'}</dt><dd>{place.license}</dd></div>}
    </dl>
    <span className="tag" id="coordinateStatus">{coordinateLabel(place)}</span>
    <div className="detail-links">
      {directions && <a href={directions} target="_blank" rel="noopener noreferrer">{locale === 'ko' ? '도보 길찾기 →' : 'Walking directions →'}</a>}
      {place.externalUrl && <a href={place.externalUrl} target="_blank" rel="noopener noreferrer">{locale === 'ko' ? '관련 정보 →' : 'More information →'}</a>}
    </div>
    {onShare && <button type="button" onClick={onShare}>{locale === 'ko' ? '링크 복사해서 공유 →' : 'Copy and share link →'}</button>}
  </section>;
}
