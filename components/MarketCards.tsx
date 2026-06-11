import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { getMarketOverview, fngLabelKo } from "@/lib/market";
import { formatKrw, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";

function fngColor(value: number): string {
  if (value <= 25) return "text-red-400";
  if (value <= 45) return "text-orange-400";
  if (value <= 55) return "text-zinc-300";
  if (value <= 75) return "text-emerald-400";
  return "text-green-400";
}

function changeColor(n: number | null): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-red-400";
  if (n < 0) return "text-blue-400";
  return "text-zinc-400";
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
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-xs font-bold text-zinc-400">김치프리미엄 (BTC)</h2>
        <p className={`mt-1 text-3xl font-bold ${changeColor(btc?.kimchiPremium ?? null)}`}>
          {formatPercent(btc?.kimchiPremium ?? null)}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          업비트 {formatKrw(btc?.priceKrw ?? null)}원 · 바이낸스 ${btc?.priceUsd?.toLocaleString() ?? "-"} · 환율{" "}
          {snapshot.usdKrw.toLocaleString()}
        </p>
        <div className="mt-3">
          <Sparkline values={kimpValues} baseline={0} stroke="#fbbf24" />
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">
          김프 추이 — 5분 간격 자동 수집 ({kimpHistory.length}개 표본)
        </p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-xs font-bold text-zinc-400">비트코인 도미넌스</h2>
        <p className="mt-1 text-3xl font-bold text-zinc-100">
          {overview.btcDominance != null ? `${overview.btcDominance.toFixed(1)}%` : "-"}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          전체 시가총액{" "}
          {overview.totalMarketCapUsd != null
            ? `$${(overview.totalMarketCapUsd / 1e12).toFixed(2)}T`
            : "-"}{" "}
          <span className={changeColor(overview.marketCapChange24h)}>
            ({formatPercent(overview.marketCapChange24h)} 24h)
          </span>
        </p>
        <p className="mt-3 text-[10px] text-zinc-600">출처: CoinGecko (5분 캐시)</p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <h2 className="text-xs font-bold text-zinc-400">공포 · 탐욕 지수</h2>
        {latestFng ? (
          <>
            <p className={`mt-1 text-3xl font-bold ${fngColor(latestFng.value)}`}>
              {latestFng.value}
              <span className="ml-2 text-base">{fngLabelKo(latestFng.classification)}</span>
            </p>
            <div className="mt-3">
              <Sparkline
                values={overview.fearGreed!.map((p) => p.value)}
                baseline={50}
                stroke="#34d399"
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">최근 30일 — 출처: Alternative.me</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">데이터를 불러오지 못했습니다.</p>
        )}
      </section>
    </div>
  );
}
