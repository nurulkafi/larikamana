import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RunKeun - Buat Rute Lari & Ekspor GPX Gratis',
  description:
    'Aplikasi web gratis untuk merencanakan rute lari, menghitung jarak real-time, estimasi pace & kalori, profil elevasi, serta ekspor file GPX untuk Garmin dan Strava.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full w-full overflow-hidden bg-slate-100">{children}</body>
    </html>
  );
}
