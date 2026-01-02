import './globals.css';
import Script from 'next/script';

import BackgroundWrapper from '@/components/background/BackgroundWrapper';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

export const metadata = {
  title: 'Portfolio',
  description: 'Personal website',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Bootstrap 5.3.3 CSS (PUBLIC) */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />

        {/* FontAwesome (PUBLIC) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          referrerPolicy="no-referrer"
        />
      </head>

      <body className="bg-black text-light">
        <BackgroundWrapper>
          <PublicNavbar />
          <main className="container py-4">{children}</main>
          <PublicFooter />
        </BackgroundWrapper>

        {/* Bootstrap JS bundle (PUBLIC) */}
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Chart.js (PUBLIC) - keep ONLY if you render charts on public pages */}
        {/*
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
          strategy="afterInteractive"
        />
        */}
      </body>
    </html>
  );
}
