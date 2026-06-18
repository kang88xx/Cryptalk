"use client";

import { useEffect, useState } from "react";
import type { TickerSnapshot } from "@/lib/ticker";
import { formatKrw, formatPercent } from "@/lib/format";

function changeColor(n: number | null): string {
  if (n == null) return "text-navy-300";
  if (n > 0) return "text-red-300";
  if (n < 0) return "text-indigo-300";
  return "text-navy-300";
}

export default function TickerBar() {
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
        // 일시적 네트워크 오류는 다음 폴링에서 복구
      }
    };
    load();
    const id = setInterval(load, 60_000); // 캐시 TTL과 균형 — 호출 비용 절감
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

  const items = snapshot?.tickers.filter((t) => t.priceKrw != null) ?? [];

  return (
    <div className="overflow-hidden bg-navy-900">
      <div className="ticker-track flex w-max items-center gap-10 px-4 py-2 font-mono text-[11px] tracking-wide whitespace-nowrap">
        {items.length === 0 ? (
          <span className="text-navy-300">LOADING MARKET DATA...</span>
        ) : (
          [...items, ...items].map((t, i) => (
            <span key={`${t.symbol}-${i}`} className="flex items-center gap-2">
              <span className="font-semibold text-white">{t.symbol}</span>
              <span className="font-light text-navy-100">{formatKrw(t.priceKrw)}</span>
              <span className={changeColor(t.change24h)}>{formatPercent(t.change24h)}</span>
              {t.kimchiPremium != null && (
                <span className="text-amber-500">김프 {formatPercent(t.kimchiPremium)}</span>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
