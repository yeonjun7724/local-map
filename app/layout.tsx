import type { Metadata } from 'next';
import Script from 'next/script';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.brand.name} · ${siteConfig.region.nameKo}`,
  description: siteConfig.brand.taglineKo,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.languages.default}>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KN799QGR"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
      </body>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KN799QGR');`}
      </Script>
    </html>
  );
}
