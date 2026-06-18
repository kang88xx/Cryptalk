import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import TickerBar from "@/components/TickerBar";
import LogoStrip from "@/components/LogoStrip";
import IndexBanner from "@/components/IndexBanner";
import AppPromo from "@/components/AppPromo";

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
        {/* 상단 배너 — 나스닥·코스피·코스닥 지수 */}
        <IndexBanner />
        <Header />
        <TickerBar />
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
