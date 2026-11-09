'use client';

import { useState } from 'react';
import type { Place, Theme } from '@/lib/data/types';
import { useMyRoute } from './MyRouteProvider';
import type { Locale } from '@/lib/i18n';
import { getMessages } from '@/lib/i18n';

type Result = { placeIds: string[]; reason: string; source: 'ai' | 'rule' };
type Props = { places: Place[]; themes: Theme[]; locale: Locale };

const text = {
  ko: { title: '나에게 맞는 코스', button: '코스 추천받기', minutes: '산책 시간', theme: '테마', companion: '함께 걷는 사람', start: '출발 장소', any: '상관없음', center: '지도 중심에서', companions: ['혼자', '둘이서', '친구와', '아이와 함께'], loading: '코스를 찾고 있어요…', show: '지도에서 보기', ai: 'AI 추천', rule: '기본 추천', error: '추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', notice: '추천 코스는 등록된 장소와 입력한 조건을 바탕으로 구성됩니다. 실제 보행 동선과 운영 정보는 방문 전에 확인해 주세요.' },
  en: { title: 'A route for you', button: 'Get a route', minutes: 'Walking time', theme: 'Theme', companion: 'Walking with', start: 'Starting point', any: 'Any', center: 'From map center', companions: ['Solo', 'As a couple', 'Friends', 'With kids'], loading: 'Finding a route…', show: 'Show on map', ai: 'AI pick', rule: 'Basic pick', error: 'Could not load a route. Please try again.', notice: 'Routes use the listed places and your selected conditions. Check walking access and opening information before your visit.' },
} as const;

export default function RecommendPanel({ places, themes, locale }: Props) {
  const t = text[locale];
  const { replace } = useMyRoute();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState<60 | 120 | 240>(120);
  const [theme, setTheme] = useState('');
  const [companion, setCompanion] = useState<'solo' | 'couple' | 'friends' | 'kids'>('kids');
  const [startId, setStartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const byId = new Map(places.map(place => [place.id, place]));

  async function recommend() {
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, theme: theme || null, companion, startId: startId || null }) });
      if (!response.ok) throw new Error('Recommendation request failed');
      setResult(await response.json() as Result);
    } catch { setError(t.error); }
    finally { setLoading(false); }
  }

  return <section className="course recommend-panel" aria-labelledby="recommend-title">
    <h2 id="recommend-title">{t.title}</h2>
    <p>{getMessages(locale).recommend.notice}</p>
    {!open && <button type="button" className="recommend-open" onClick={() => setOpen(true)}>{t.button}</button>}
    {open && <div className="recommend-form">
      <fieldset><legend>{t.minutes}</legend><div className="recommend-options">
        {([60, 120, 240] as const).map(value => <button type="button" key={value} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value} {locale === 'ko' ? '분' : 'min'}</button>)}
      </div></fieldset>
      <fieldset><legend>{t.theme}</legend><div className="recommend-options">
        <button type="button" aria-pressed={!theme} onClick={() => setTheme('')}>{t.any}</button>
        {themes.map(item => <button type="button" key={item.id} aria-pressed={theme === item.id} onClick={() => setTheme(item.id)}>{locale === 'ko' ? item.nameKo : item.nameEn}</button>)}
      </div></fieldset>
      <fieldset><legend>{t.companion}</legend><div className="recommend-options">
        {(['solo', 'couple', 'friends', 'kids'] as const).map((value, index) => <button type="button" key={value} aria-pressed={companion === value} onClick={() => setCompanion(value)}>{t.companions[index]}</button>)}
      </div></fieldset>
      <fieldset><legend>{t.start}</legend><div className="recommend-options recommend-starts">
        <button type="button" aria-pressed={!startId} onClick={() => setStartId('')}>{t.center}</button>
        {places.filter(place => place.latitude !== null && place.longitude !== null).map(place => <button type="button" key={place.id} aria-pressed={startId === place.id} onClick={() => setStartId(place.id)}>{locale === 'ko' ? place.nameKo : place.nameEn || place.nameKo}</button>)}
      </div></fieldset>
      <button type="button" className="recommend-open" onClick={recommend} disabled={loading}>{loading ? t.loading : t.button}</button>
      {error && <p role="alert">{error}</p>}
    </div>}
    {result && <div className="recommend-result">
      <span className={`recommend-badge ${result.source}`}>{result.source === 'ai' ? t.ai : t.rule}</span>
      <ol>{result.placeIds.map((id, index) => <li key={id}>{index + 1}. {locale === 'ko' ? byId.get(id)?.nameKo : byId.get(id)?.nameEn || byId.get(id)?.nameKo}</li>)}</ol>
      <p>{result.reason}</p>
      <button type="button" className="recommend-open" onClick={() => replace(result.placeIds)}>{t.show}</button>
    </div>}
  </section>;
}
