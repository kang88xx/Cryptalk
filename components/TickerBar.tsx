"use client";

import { useEffect, useState } from "react";
import type { TickerSnapshot } from "@/lib/ticker";
import { formatKrw, formatPercent } from "@/lib/format";

function changeColor(n: number | null): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-red-400";
  if (n < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default function TickerBar() {
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
        // 일시적 네트워크 오류는 다음 폴링에서 복구
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = snapshot?.tickers.filter((t) => t.priceKrw != null) ?? [];

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="ticker-track flex w-max items-center gap-8 px-4 py-1.5 text-xs whitespace-nowrap">
        {items.length === 0 ? (
          <span className="text-zinc-500">시세 불러오는 중...</span>
        ) : (
          [...items, ...items].map((t, i) => (
            <span key={`${t.symbol}-${i}`} className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-200">{t.symbol}</span>
              <span className="text-zinc-300">{formatKrw(t.priceKrw)}</span>
              <span className={changeColor(t.change24h)}>{formatPercent(t.change24h)}</span>
              {t.kimchiPremium != null && (
                <span className="text-amber-400/90">김프 {formatPercent(t.kimchiPremium)}</span>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
