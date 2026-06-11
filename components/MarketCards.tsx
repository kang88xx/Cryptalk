import { Fragment } from "react";
import { prisma } from "@/lib/prisma";
import { getTickers, getExchangeComparison } from "@/lib/ticker";
import { getMarketOverview, getFxHistory, fngLabelKo } from "@/lib/market";
import { formatKrw, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import FngGauge from "@/components/FngGauge";

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

// 김프(BTC) · 도미넌스 · 공포탐욕 3카드 — 홈/대시보드 공용
export default async function MarketCards() {
  const [snapshot, overview, exchanges, fxHistory, domHistory] = await Promise.all([
    getTickers(),
    getMarketOverview(),
    getExchangeComparison(),
    getFxHistory(),
    prisma.marketSnapshot
      .findMany({ orderBy: { createdAt: "desc" }, take: 336 })
      .then((rows) => rows.reverse()),
  ]);

  const btc = snapshot.tickers.find((t) => t.symbol === "BTC");
  const latestFng = overview.fearGreed?.at(-1) ?? null;

  // 김프 = (국내가 / 기준가 - 1) × 100 — BTC는 바이낸스×환율, USDT는 환율 대비
  const premium = (krw: number | null, base: number | null) =>
    krw != null && base != null && base > 0 ? (krw / base - 1) * 100 : null;
  const btcBase = btc?.priceUsd != null ? btc.priceUsd * snapshot.usdKrw : null;
  const kimpGrid = [
    {
      label: "BTC",
      upbit: premium(exchanges.btcUpbit, btcBase),
      bithumb: premium(exchanges.btcBithumb, btcBase),
    },
    {
      label: "USDT",
      upbit: premium(exchanges.usdtUpbit, snapshot.usdKrw),
      bithumb: premium(exchanges.usdtBithumb, snapshot.usdKrw),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className="border border-line bg-white p-5">
        <h2 className="eyebrow">Kimchi Premium · BTC</h2>
        <p className={`mt-2 font-mono text-4xl font-medium tracking-tight ${changeColor(btc?.kimchiPremium ?? null)}`}>
          {formatPercent(btc?.kimchiPremium ?? null)}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-ink-500">
          업비트 {formatKrw(btc?.priceKrw ?? null)}원 · 바이낸스 ${btc?.priceUsd?.toLocaleString() ?? "–"} · 환율{" "}
          {snapshot.usdKrw.toLocaleString()}
        </p>
        {/* 거래소별 김프 — 위 BTC · 아래 USDT */}
        <div className="mt-4 border-t border-line pt-3">
          <div className="grid grid-cols-[44px_1fr_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
            <span />
            <span className="text-right text-[10px] text-navy-300">업비트</span>
            <span className="text-right text-[10px] text-navy-300">빗썸</span>
            {kimpGrid.map((row) => (
              <Fragment key={row.label}>
                <span className="font-semibold text-navy-900">{row.label}</span>
                <span
                  className={`text-right font-mono font-semibold ${changeColor(row.upbit)}`}
                >
                  {formatPercent(row.upbit)}
                </span>
                <span
                  className={`text-right font-mono font-semibold ${changeColor(row.bithumb)}`}
                >
                  {formatPercent(row.bithumb)}
                </span>
              </Fragment>
            ))}
          </div>

          {/* 환율 지난 6일 */}
          <div className="mt-3 grid grid-cols-6 gap-1 border-t border-line pt-3">
            {fxHistory.map((p) => {
              const d = new Date(p.date + "T00:00:00Z");
              return (
                <div key={p.date} className="bg-paper px-1 py-1.5 text-center">
                  <p className="text-[9px] text-navy-300">
                    {d.getUTCMonth() + 1}/{d.getUTCDate()}
                  </p>
                  <p className="font-mono text-xs font-semibold text-navy-900">
                    {Math.round(p.rate).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="rail mt-2">환율 USD/KRW · 최근 6영업일</p>
        </div>
      </section>

      <section className="border border-line bg-white p-5">
        <h2 className="eyebrow">BTC Dominance</h2>
        <p className="mt-2 font-mono text-4xl font-medium tracking-tight text-navy-900">
          {overview.btcDominance != null ? `${overview.btcDominance.toFixed(1)}%` : "–"}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-ink-500">
          전체 시가총액{" "}
          {overview.totalMarketCapUsd != null
            ? `$${(overview.totalMarketCapUsd / 1e12).toFixed(2)}T`
            : "–"}{" "}
          <span className={changeColor(overview.marketCapChange24h)}>
            ({formatPercent(overview.marketCapChange24h)} 24h)
          </span>
        </p>
        <div className="mt-4 border-t border-line pt-3">
          <Sparkline values={domHistory.map((s) => s.btcDominance)} stroke="#091955" />
          <p className="rail mt-2">
            도미넌스 추이 · 15min interval · {domHistory.length} samples ·{" "}
            <a
              href="https://www.coingecko.com/en/global-charts"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              CoinGecko ↗
            </a>
          </p>
        </div>
      </section>

      <section className="border border-line bg-white p-5">
        <h2 className="eyebrow">Fear &amp; Greed Index</h2>
        {latestFng ? (
          <>
            <div className="mt-1 flex justify-center">
              <FngGauge value={latestFng.value} label={fngLabelKo(latestFng.classification)} />
            </div>
            {/* 지난 6일 — 수치만 작게 */}
            <div className="mt-3 grid grid-cols-6 gap-1 border-t border-line pt-3">
              {overview.fearGreed!.slice(-7, -1).map((p) => {
                const d = new Date(p.date);
                return (
                  <div key={p.date} className="bg-paper px-1 py-1.5 text-center">
                    <p className="text-[9px] text-navy-300">
                      {d.getUTCMonth() + 1}/{d.getUTCDate()}
                    </p>
                    <p className={`font-mono text-xs font-semibold ${fngColor(p.value)}`}>
                      {p.value}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="rail mt-2">지난 6일 · Alternative.me</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
        )}
      </section>
    </div>
  );
}
