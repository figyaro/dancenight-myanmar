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
