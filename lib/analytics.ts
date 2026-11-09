export type AnalyticsScope = 'map' | 'route' | 'place';
export type AnalyticsEventName = 'route_open' | 'place_open' | 'share' | 'qr_download' | 'recommend';

export type AnalyticsEventParams = {
  route_open: { route_id: string };
  place_open: { place_id: string; category: string };
  share: { scope: AnalyticsScope };
  qr_download: { scope: AnalyticsScope };
  recommend: {
    source: 'ai' | 'rule';
    minutes: 60 | 120 | 240;
    theme: string | null;
    companion: 'solo' | 'couple' | 'friends' | 'kids';
  };
};

declare global {
  interface Window {
    gtag?: (command: 'event', name: AnalyticsEventName, params: AnalyticsEventParams[AnalyticsEventName]) => void;
  }
}

export function track<T extends AnalyticsEventName>(name: T, params: AnalyticsEventParams[T]): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
