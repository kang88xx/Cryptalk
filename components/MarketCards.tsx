import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { getMarketOverview, fngLabelKo } from "@/lib/market";
import { formatKrw, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";

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
  const [snapshot, overview, kimpHistory] = await Promise.all([
    getTickers(),
    getMarketOverview(),
    prisma.kimpSnapshot
      .findMany({ orderBy: { createdAt: "desc" }, take: 288 })
      .then((rows) => rows.reverse()),
  ]);

  const btc = snapshot.tickers.find((t) => t.symbol === "BTC");
  const latestFng = overview.fearGreed?.at(-1) ?? null;
  const kimpValues = kimpHistory.map((s) => s.kimp);

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
        <div className="mt-4 border-t border-line pt-3">
          <Sparkline values={kimpValues} baseline={0} stroke="#636DDB" />
          <p className="rail mt-2">5min interval · {kimpHistory.length} samples</p>
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
          <p className="rail">Source · CoinGecko · 5min cache</p>
        </div>
      </section>

      <section className="border border-line bg-white p-5">
        <h2 className="eyebrow">Fear &amp; Greed Index</h2>
        {latestFng ? (
          <>
            <p className={`mt-2 font-mono text-4xl font-medium tracking-tight ${fngColor(latestFng.value)}`}>
              {latestFng.value}
              <span className="ml-2 font-sans text-base font-medium">
                {fngLabelKo(latestFng.classification)}
              </span>
            </p>
            <div className="mt-4 border-t border-line pt-3">
              <Sparkline
                values={overview.fearGreed!.map((p) => p.value)}
                baseline={50}
                stroke="#EFC540"
              />
              <p className="rail mt-2">30 days · Alternative.me</p>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
        )}
      </section>
    </div>
  );
}
