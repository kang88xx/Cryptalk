import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { getMarketOverview, fngLabelKo } from "@/lib/market";
import { formatKrw, formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
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
  const sortedByKimp = [...snapshot.tickers]
    .filter((t) => t.kimchiPremium != null)
    .sort((a, b) => (b.kimchiPremium ?? 0) - (a.kimchiPremium ?? 0));

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-zinc-100">데이터 대시보드</h1>

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

      <section className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60">
        <header className="border-b border-zinc-800 px-4 py-2.5">
          <h2 className="text-sm font-bold text-zinc-100">코인별 김치프리미엄</h2>
        </header>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500">
              <th className="px-4 py-2 text-left font-medium">코인</th>
              <th className="px-2 py-2 text-right font-medium">업비트(원)</th>
              <th className="px-2 py-2 text-right font-medium">바이낸스($)</th>
              <th className="px-2 py-2 text-right font-medium">24H</th>
              <th className="px-4 py-2 text-right font-medium">김프</th>
            </tr>
          </thead>
          <tbody>
            {sortedByKimp.map((t) => (
              <tr key={t.symbol} className="border-t border-zinc-800/60">
                <td className="px-4 py-2">
                  <b className="text-zinc-200">{t.symbol}</b>{" "}
                  <span className="text-xs text-zinc-500">{t.name}</span>
                </td>
                <td className="px-2 py-2 text-right text-zinc-200">{formatKrw(t.priceKrw)}</td>
                <td className="px-2 py-2 text-right text-zinc-400">
                  {t.priceUsd != null ? t.priceUsd.toLocaleString() : "-"}
                </td>
                <td className={`px-2 py-2 text-right ${changeColor(t.change24h)}`}>
                  {formatPercent(t.change24h)}
                </td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    (t.kimchiPremium ?? 0) > 0 ? "text-amber-400" : "text-zinc-400"
                  }`}
                >
                  {formatPercent(t.kimchiPremium)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
