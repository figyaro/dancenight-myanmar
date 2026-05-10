import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import GlobalLoader from "./components/GlobalLoader";
import ImpersonationBanner from "./components/ImpersonationBanner";
import ImpersonationLogic from "./components/ImpersonationLogic";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dance Together",
  description: "ミャンマー最大のダンス・ナイトライフプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://vz-dc7bf078-297.b-cdn.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://player.mediadelivery.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://iframe.mediadelivery.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dancetgt.b-cdn.net" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <Suspense fallback={null}>
          <GlobalLoader />
          <ImpersonationLogic />
        </Suspense>
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}
