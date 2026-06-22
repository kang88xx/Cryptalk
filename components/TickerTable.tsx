"use client";

import { useEffect, useState } from "react";
import type { TickerSnapshot } from "@/lib/ticker";
import { formatKrw, formatPercent, formatVolume } from "@/lib/format";

function changeColor(n: number | null): string {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

export default function TickerTable() {
  const [snapshot, setSnapshot] = useState<TickerSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return; // 백그라운드 탭은 폴링 정지
      try {
        const res = await fetch("/api/ticker");
        if (!res.ok) return;
        const data = (await res.json()) as TickerSnapshot;
        if (alive) setSnapshot(data);
      } catch {
        // 다음 폴링에서 복구
      }
    };
    load();
    const id = setInterval(load, 60_000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <section className="border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-navy-900 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-white">실시간 시세</h2>
        <span className="font-mono text-[10px] tracking-[0.12em] text-navy-300 uppercase">
          UPBIT · USD/KRW {snapshot ? snapshot.usdKrw.toLocaleString() : "–"}
        </span>
      </header>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-navy-900 font-light text-white">
            <th className="px-4 py-2 text-left font-normal">코인</th>
            <th className="px-2 py-2 text-right font-normal">시세(원)</th>
            <th className="px-2 py-2 text-right font-normal">24H</th>
            <th className="px-4 py-2 text-right font-normal">김프</th>
          </tr>
        </thead>
        <tbody>
          {snapshot == null ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-ink-500">
                시세 불러오는 중...
              </td>
            </tr>
          ) : (
            snapshot.tickers.map((t) => (
              <tr key={t.symbol} className="border-t border-line">
                <td className="px-4 py-2">
                  <span className="font-semibold text-navy-900">{t.symbol}</span>
                </td>
                <td
                  className="px-2 py-2 text-right font-mono text-ink-900"
                  title={`거래대금 ${formatVolume(t.volumeKrw24h)}`}
                >
                  {formatKrw(t.priceKrw)}
                </td>
                <td className={`px-2 py-2 text-right font-mono ${changeColor(t.change24h)}`}>
                  {formatPercent(t.change24h)}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`inline-block px-1.5 py-0.5 font-mono ${
                      t.kimchiPremium != null && t.kimchiPremium > 0
                        ? "bg-amber-300/50 text-navy-900"
                        : "text-ink-500"
                    }`}
                  >
                    {formatPercent(t.kimchiPremium)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
