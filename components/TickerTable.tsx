"use client";

import { useEffect, useState } from "react";
import type { TickerSnapshot } from "@/lib/ticker";
import { formatKrw, formatPercent, formatVolume } from "@/lib/format";

function changeColor(n: number | null): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-red-400";
  if (n < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default function TickerTable() {
  const [snapshot, setSnapshot] = useState<TickerSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
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
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <h2 className="text-sm font-bold text-zinc-100">실시간 시세</h2>
        <span className="text-[11px] text-zinc-500">
          업비트 기준 · USD/KRW {snapshot ? snapshot.usdKrw.toLocaleString() : "-"}
        </span>
      </header>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500">
            <th className="px-4 py-2 text-left font-medium">코인</th>
            <th className="px-2 py-2 text-right font-medium">시세(원)</th>
            <th className="px-2 py-2 text-right font-medium">24H</th>
            <th className="px-4 py-2 text-right font-medium">김프</th>
          </tr>
        </thead>
        <tbody>
          {snapshot == null ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                시세 불러오는 중...
              </td>
            </tr>
          ) : (
            snapshot.tickers.map((t) => (
              <tr key={t.symbol} className="border-t border-zinc-800/60">
                <td className="px-4 py-1.5">
                  <span className="font-semibold text-zinc-200">{t.symbol}</span>{" "}
                  <span className="text-zinc-500">{t.name}</span>
                </td>
                <td className="px-2 py-1.5 text-right text-zinc-200" title={`거래대금 ${formatVolume(t.volumeKrw24h)}`}>
                  {formatKrw(t.priceKrw)}
                </td>
                <td className={`px-2 py-1.5 text-right ${changeColor(t.change24h)}`}>
                  {formatPercent(t.change24h)}
                </td>
                <td className={`px-4 py-1.5 text-right ${t.kimchiPremium != null && t.kimchiPremium > 0 ? "text-amber-400/90" : "text-zinc-400"}`}>
                  {formatPercent(t.kimchiPremium)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
