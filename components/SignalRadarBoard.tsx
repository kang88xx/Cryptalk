"use client";

import { useState } from "react";
import type { Signal } from "@/lib/signals";
import { toneClass } from "@/lib/signals";
import { formatKrw, formatPercent } from "@/lib/format";
import CoinDrawer, { type DrawerCoin } from "@/components/CoinDrawer";
import BubbleMap from "@/components/BubbleMap";

function changeColor(n: number): string {
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

export default function SignalRadarBoard({
  items,
  breadth,
  freshness,
}: {
  items: DrawerCoin[];
  breadth: { upPct: number; signal: Signal } | null;
  freshness: string;
}) {
  const [selected, setSelected] = useState<DrawerCoin | null>(null);

  return (
    <section className="border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-navy-900">지금 봐야 할 코인</h2>
          <span className="eyebrow hidden sm:inline">KRW Signal Radar</span>
        </div>
        <div className="flex items-center gap-2">
          {breadth && (
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${toneClass(breadth.signal.tone)}`}>
              상승 {breadth.upPct.toFixed(0)}% · {breadth.signal.label}
            </span>
          )}
          <span className="text-[10px] text-navy-300">{freshness}</span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* 좌측: 코인 시그널 리스트 (50%) */}
        <div className="min-w-0 lg:w-1/2 lg:flex-none">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map(({ coin, chips }) => (
                <li key={coin.symbol}>
                  <button
                    onClick={() => setSelected({ coin, chips })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-paper"
                  >
                    <span className="w-4 shrink-0 text-center text-xs font-bold text-navy-300">
                      {coin.volumeRank}
                    </span>
                    <span className="w-12 shrink-0 font-semibold text-navy-900">{coin.symbol}</span>
                    <span className="hidden w-24 shrink-0 text-right font-mono text-ink-900 sm:block">
                      {formatKrw(coin.priceKrw)}
                    </span>
                    <span className={`w-16 shrink-0 text-right font-mono font-semibold ${changeColor(coin.change24h)}`}>
                      {formatPercent(coin.change24h)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
                      {chips.map((c, i) => (
                        <span
                          key={i}
                          className={`rounded px-1 py-0.5 text-[10px] font-medium ${toneClass(c.tone)}`}
                        >
                          {c.label}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 우측: 시총 상위 버블맵 (50%) */}
        <div className="min-w-0 border-t border-line p-3 lg:w-1/2 lg:flex-none lg:border-l lg:border-t-0">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold text-navy-900">시총 상위 버블맵</h3>
            <span className="eyebrow">Bubble Map</span>
          </div>
          <div className="h-[400px]">
            <BubbleMap />
          </div>
        </div>
      </div>

      <CoinDrawer item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
