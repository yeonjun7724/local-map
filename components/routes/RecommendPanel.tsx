'use client';

import { useRef, useState } from 'react';
import type { Place, Theme } from '@/lib/data/types';
import { getMessages, type Locale } from '@/lib/i18n';
import { responseSchema, type Conditions, type RecommendationResponse } from '@/lib/recommend/types';
import { useMyRoute } from './MyRouteProvider';

export default function RecommendPanel({ places, themes, locale, onShow }: {
  places: Place[]; themes: Theme[]; locale: Locale; onShow: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [conditions, setConditions] = useState<Conditions>({ minutes: 120, theme: null, companion: 'kids', startId: null });
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const myRoute = useMyRoute();
  const t = getMessages(locale).recommend;
  const byId = new Map(places.map(place => [place.id, place]));
  function change(next: Partial<Conditions>) {
    setConditions(value => ({ ...value, ...next })); setResult(null); setError('');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setResult(null); setError('');
    try {
      const response = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conditions), signal: AbortSignal.timeout(15000) });
      const body: unknown = await response.json();
      if (!response.ok) { setError(response.status === 422 ? t.noMatch : t.failed); return; }
      const parsed = responseSchema.safeParse(body);
      if (!parsed.success || new Set(parsed.data.placeIds).size !== parsed.data.placeIds.length
        || parsed.data.placeIds.some(id => !byId.has(id))) { setError(t.failed); return; }
      setResult(parsed.data);
    } catch { setError(t.failed); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="recommend-panel" aria-label={t.title}>
    <button type="button" className="recommend-toggle" aria-expanded={open} aria-controls="recommend-form" onClick={() => setOpen(value => !value)}>{t.title}</button>
    {open && <div id="recommend-form">
      <p className="note">{t.notice}</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}><legend>{t.time}</legend><div className="recommend-options">
          {([60, 120, 240] as const).map(minutes => <label key={minutes}><input type="radio" name="minutes" value={minutes}
            checked={conditions.minutes === minutes} onChange={() => change({ minutes })} />{minutes}{locale === 'ko' ? '분' : ' min'}</label>)}
        </div></fieldset>
        <fieldset disabled={busy}><legend>{t.theme}</legend><div className="recommend-options">
          <label><input type="radio" name="theme" checked={conditions.theme === null} onChange={() => change({ theme: null })} />{t.any}</label>
          {themes.map(theme => <label key={theme.id}><input type="radio" name="theme" value={theme.id} checked={conditions.theme === theme.id}
            onChange={() => change({ theme: theme.id })} />{locale === 'en' ? theme.nameEn : theme.nameKo}</label>)}
        </div></fieldset>
        <fieldset disabled={busy}><legend>{t.companion}</legend><div className="recommend-options">
          {(['solo', 'couple', 'friends', 'kids'] as const).map(value => <label key={value}><input type="radio" name="companion" value={value}
            checked={conditions.companion === value} onChange={() => change({ companion: value })} />{t.companions[value]}</label>)}
        </div></fieldset>
        <fieldset disabled={busy}><legend>{t.start}</legend><div className="recommend-options recommend-starts">
          <label><input type="radio" name="startId" checked={conditions.startId === null} onChange={() => change({ startId: null })} />{t.center}</label>
          {places.filter(place => place.longitude !== null && place.latitude !== null).map(place => <label key={place.id}><input type="radio" name="startId" value={place.id}
            checked={conditions.startId === place.id} onChange={() => change({ startId: place.id })} />{locale === 'en' && place.nameEn ? place.nameEn : place.nameKo}</label>)}
        </div></fieldset>
        <button type="submit" disabled={busy}>{busy ? t.loading : t.submit}</button>
      </form>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p className="recommend-error" role="alert">{error}</p>}
        {result && <div className="recommend-result"><span className="recommend-badge">{result.source === 'ai' ? t.ai : t.rule}</span>
          <ol>{result.placeIds.map(id => <li key={id}>{locale === 'en' && byId.get(id)!.nameEn ? byId.get(id)!.nameEn : byId.get(id)!.nameKo}</li>)}</ol>
          <p>{result.reason}</p>
          <button type="button" onClick={() => { myRoute.replace(result.placeIds); onShow(); }}>{t.show}</button>
        </div>}
      </div>
    </div>}
  </section>;
}
