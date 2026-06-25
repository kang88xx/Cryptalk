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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 섹션 1: 지금 봐야 할 코인 */}
      <section className="flex flex-col rounded-xl border border-line bg-white shadow-card overflow-hidden transition-shadow hover:shadow-pop">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-3">
          <div className="flex items-baseline gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />지금 봐야 할 코인</h2>
            <span className="hidden text-[11px] font-medium tracking-[0.12em] text-ink-500 uppercase sm:inline">
              KRW Signal Radar
            </span>
          </div>
          <div className="flex items-center gap-2">
            {breadth && (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${toneClass(breadth.signal.tone)}`}>
                상승 {breadth.upPct.toFixed(0)}% · {breadth.signal.label}
              </span>
            )}
            <span className="text-[10px] text-ink-500">{freshness}</span>
          </div>
        </header>

        <div className="min-w-0 flex-1">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map(({ coin, chips }, idx) => (
                <li key={coin.symbol}>
                  <button
                    onClick={() => setSelected({ coin, chips })}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs hover:bg-paper"
                  >
                    <span className="w-4 shrink-0 text-center text-[10px] font-bold text-navy-300">
                      {idx + 1}
                    </span>
                    <span className="flex w-20 shrink-0 flex-col leading-tight">
                      <span className="truncate text-[11px] font-semibold text-navy-900">{coin.nameKo}</span>
                      <span className="font-mono text-[9px] tracking-wide text-ink-400">{coin.symbol}</span>
                    </span>
                    <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] text-ink-900 sm:block">
                      {formatKrw(coin.priceKrw)}
                    </span>
                    <span className={`w-14 shrink-0 text-right font-mono text-[11px] font-semibold ${changeColor(coin.change24h)}`}>
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

        <p className="border-t border-line px-4 py-2 text-[10px] text-ink-500">
          ※ 스테이블코인(USDT·USDC 등)은 시세 변동 신호 대상이 아니므로 수집·표시하지 않습니다.
        </p>
      </section>

      {/* 섹션 2: 시총 상위 버블맵 */}
      <section className="flex flex-col rounded-xl border border-line bg-white shadow-card overflow-hidden transition-shadow hover:shadow-pop">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />시총 상위 버블맵</h2>
          <span className="text-[11px] font-medium tracking-[0.12em] text-ink-500 uppercase">
            Bubble Map
          </span>
        </header>
        <div className="flex-1 p-3">
          <div className="h-[340px] lg:h-[460px]">
            <BubbleMap />
          </div>
        </div>
      </section>

      <CoinDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
