import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getTickers, getExchangeComparison } from "@/lib/ticker";
import { getMarketOverview, getFxHistory, fngLabelKo } from "@/lib/market";
import { formatPercent, formatRelativeTime } from "@/lib/format";
import { fngSignal, toneClass } from "@/lib/signals";
import Sparkline from "@/components/Sparkline";
import FngGauge from "@/components/FngGauge";
import FxChart from "@/components/FxChart";
import TickerTable from "@/components/TickerTable";

function fngColor(value: number): string {
  if (value <= 25) return "text-red-600";
  if (value <= 45) return "text-orange-500";
  if (value <= 55) return "text-ink-900";
  if (value <= 75) return "text-emerald-600";
  return "text-emerald-700";
}

function changeColor(n: number | null): string {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

// 카드 상단 넘버링 eyebrow
function CardHead({ no, title, meta }: { no: string; title: string; meta: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] tracking-[0.16em] text-navy-500 uppercase">
        {no} · {title}
      </span>
      <span className="font-mono text-[10px] tracking-[0.12em] text-navy-300 uppercase">{meta}</span>
    </div>
  );
}

// 실시간 시세 · 도미넌스+환율 · 공포탐욕 3카드 — 홈/대시보드 공용
export default async function MarketCards() {
  const [overview, domHistory, snapshot, fxHistory, exchanges] = await Promise.all([
    getMarketOverview(),
    prisma.marketSnapshot
      .findMany({ orderBy: { createdAt: "desc" }, take: 336 })
      .then((rows) => rows.reverse()),
    getTickers(),
    getFxHistory(),
    getExchangeComparison(),
  ]);

  const latestFng = overview.fearGreed?.at(-1) ?? null;
  const fngSig = latestFng ? fngSignal(latestFng.classification) : null;

  // 환율 — 현재값 + 전 영업일 대비 등락(색 농도용, 표시 6일)
  const fxIsEstimate = snapshot.usdKrwSource === "fallback";
  const fxDisplay = fxHistory.slice(-6);
  const fxChangeAt = (i: number): number | null => {
    const idx = fxHistory.length - fxDisplay.length + i;
    const prev = fxHistory[idx - 1];
    const cur = fxHistory[idx];
    return prev && cur ? (cur.rate / prev.rate - 1) * 100 : null;
  };
  const fxLatestChange = fxDisplay.length ? fxChangeAt(fxDisplay.length - 1) : null;

  // 테더(USDT) 김프 — 업비트 테더 시세 vs 공식환율
  const usdtKimchi =
    exchanges.usdtUpbit != null && snapshot.usdKrw > 0
      ? (exchanges.usdtUpbit / snapshot.usdKrw - 1) * 100
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* 01 · 실시간 시세 (기존 김치프리미엄 카드 대체) */}
      <TickerTable />

      {/* 02 · BTC DOMINANCE(압축) + 환율 USD/KRW */}
      <section className="flex flex-col border border-line bg-white p-5 transition-colors hover:border-navy-300">
        <CardHead no="02" title="BTC Dominance" meta={`${formatRelativeTime(overview.updatedAt)} · CoinGecko`} />

        {/* 도미넌스 — 콤팩트 (숫자 + 시총 + 소형 스파크라인) */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-sans text-[28px] font-light leading-none tracking-[-0.03em] tabular-nums text-navy-900">
              {overview.btcDominance != null ? `${overview.btcDominance.toFixed(1)}%` : "–"}
            </span>
            <p className="mt-1 text-[11px] text-ink-500">
              시총{" "}
              <span className="font-mono text-ink-700">
                {overview.totalMarketCapUsd != null ? `$${(overview.totalMarketCapUsd / 1e12).toFixed(2)}T` : "–"}
              </span>{" "}
              <span className={`font-mono ${changeColor(overview.marketCapChange24h)}`}>
                {formatPercent(overview.marketCapChange24h)}
              </span>
            </p>
          </div>
          <Sparkline
            values={domHistory.map((s) => s.btcDominance)}
            width={96}
            height={36}
            stroke="#20305f"
            accentRing="#EFC540"
          />
        </div>

        <div className="my-4 h-px bg-line" />

        {/* 환율 USD/KRW + 현재 테더(USDT) 가격 (기존 독립 섹션 통합) */}
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-navy-900">환율 USD/KRW</span>
            <span className="font-mono text-lg font-light tabular-nums text-navy-900">
              {snapshot.usdKrw.toLocaleString()}
            </span>
            {fxLatestChange != null && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  fxLatestChange >= 0 ? "text-red-600" : "text-indigo-700"
                }`}
              >
                {fxLatestChange >= 0 ? "+" : ""}
                {fxLatestChange.toFixed(2)}%
              </span>
            )}
          </span>
          {exchanges.usdtUpbit != null && (
            <span className="flex items-baseline gap-1.5 text-[12px] text-ink-500">
              테더(USDT){" "}
              <span className="font-mono text-[13px] tabular-nums text-navy-900">
                {Math.round(exchanges.usdtUpbit).toLocaleString()}원
              </span>
              {usdtKimchi != null && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    usdtKimchi > 0 ? "text-red-600" : usdtKimchi < 0 ? "text-indigo-700" : "text-ink-500"
                  }`}
                >
                  김프 {usdtKimchi >= 0 ? "+" : ""}
                  {usdtKimchi.toFixed(2)}%
                </span>
              )}
            </span>
          )}
        </div>

        <FxChart
          points={fxDisplay.map((p, i) => ({ date: p.date, rate: p.rate, change: fxChangeAt(i) }))}
        />

        <p className="mt-auto flex items-center gap-1 pt-2 font-mono text-[10px] tracking-[0.14em] text-navy-400 uppercase">
          {fxIsEstimate ? (
            <span className="text-red-600">⚠ 환율 일시 추정 · 김프 정확도 주의</span>
          ) : (
            <>
              도미넌스
              <Image
                src="/coingecko.png"
                alt="CoinGecko"
                width={12}
                height={12}
                className="inline-block rounded-full"
              />
              CoinGecko · 환율 ECB · 테더 업비트
            </>
          )}
        </p>
      </section>

      {/* 03 · FEAR & GREED */}
      <section className="flex flex-col border border-line bg-white p-5 transition-colors hover:border-navy-300">
        <CardHead no="03" title="Fear &amp; Greed" meta="Daily" />
        {latestFng ? (
          <>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[220px]">
                <FngGauge value={latestFng.value} label={fngLabelKo(latestFng.classification)} />
              </div>
              {fngSig && (
                <span className={`mt-2 rounded px-2 py-1 text-[11px] font-semibold ${toneClass(fngSig.tone)}`}>
                  {fngSig.label}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-6 gap-1.5">
              {overview.fearGreed!.slice(-7, -1).map((p) => {
                const d = new Date(p.date);
                return (
                  <div key={p.date} className="border border-line bg-paper px-1 py-1.5 text-center">
                    <p className="font-mono text-[10px] text-ink-300">
                      {d.getUTCMonth() + 1}/{d.getUTCDate()}
                    </p>
                    <p className={`mt-0.5 font-mono text-[13px] tabular-nums ${fngColor(p.value)}`}>{p.value}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-auto pt-3 font-mono text-[10px] tracking-[0.14em] text-navy-400 uppercase">
              지난 6일 · BTC 기준 · Alternative.me
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
        )}
      </section>
    </div>
  );
}
