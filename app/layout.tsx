import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  title: '호수산책 · 일산 호수공원',
  description: '아이와 함께 둘러볼 일산 호수공원 산책 장소를 찾아보세요.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
