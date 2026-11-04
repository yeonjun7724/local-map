import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.brand.name} · ${siteConfig.region.nameKo}`,
  description: siteConfig.brand.taglineKo,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang={siteConfig.languages.default}><body>{children}</body></html>;
}
