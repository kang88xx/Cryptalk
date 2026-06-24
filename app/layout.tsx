import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import TickerBar from "@/components/TickerBar";
import LogoStrip from "@/components/LogoStrip";
import MarketBar from "@/components/MarketBar";
import AppPromo from "@/components/AppPromo";
import VisitTracker from "@/components/VisitTracker";
import { HeaderSkeleton, MarketBarSkeleton } from "@/components/Skeletons";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cryptalk - 크립토 커뮤니티",
  description: "실시간 시세와 김치프리미엄, 크립토 커뮤니티 Cryptalk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <VisitTracker />
        {/* Header·MarketBar는 async라 Suspense로 감싸 셸을 막지 않게 한다(즉시 스트리밍) */}
        <Suspense fallback={<HeaderSkeleton />}>
          <Header />
        </Suspense>
        <TickerBar />
        {/* 마켓바 — 티커 바 아래에 배치 (크립토·주가지수·코인 미니차트 + 동시접속·언어) */}
        <Suspense fallback={<MarketBarSkeleton />}>
          <MarketBar />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <AppPromo />
        <LogoStrip />
        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-6">
            <p className="rail">Cryptalk · Crypto Community</p>
            <p className="text-xs text-ink-500">
              시세 출처: 업비트 · 바이낸스 · Frankfurter(환율) — 투자 판단의 책임은 본인에게 있습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
