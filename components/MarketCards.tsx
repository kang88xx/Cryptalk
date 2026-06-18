import { prisma } from "@/lib/prisma";
import { getTickers, getExchangeComparison } from "@/lib/ticker";
import { getMarketOverview, getFxHistory, fngLabelKo } from "@/lib/market";
import { formatKrw, formatPercent, formatRelativeTime } from "@/lib/format";
import { kimchiSignal, usdtBasisSignal, fngSignal, toneClass } from "@/lib/signals";
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

  // 김프 = (국내가 / 기준가 - 1) × 100
  const premium = (krw: number | null, base: number | null) =>
    krw != null && base != null && base > 0 ? (krw / base - 1) * 100 : null;

  // 김프 분해 (이중계산 방지):
  //  · USDT 베이시스 = USDT/KRW vs 환율 → 원화 자금 압력
  //  · BTC 잔여      = 국내 USDT 기준 대비 BTC 초과분 → 코인 고유 프리미엄
  //  두 값을 곱하면 전통 김프와 일치한다.
  const usdtBasis = premium(exchanges.usdtUpbit, snapshot.usdKrw);
  // 헤드라인 김프(btc.priceKrw 기준)와 정확히 일치하도록 잔여도 같은 가격 소스 사용:
  //   usdtBasis × btcResidual = btc.priceKrw / (priceUsd × usdKrw) - 1 = 전통 김프
  const btcResidual =
    btc?.priceKrw != null && btc?.priceUsd != null && exchanges.usdtUpbit
      ? premium(btc.priceKrw, btc.priceUsd * exchanges.usdtUpbit)
      : null;

  const kimchiSig = kimchiSignal(btc?.kimchiPremium ?? null);
  const usdtSig = usdtBasisSignal(usdtBasis);
  const fngSig = latestFng ? fngSignal(latestFng.classification) : null;
  const fxIsEstimate = snapshot.usdKrwSource === "fallback";
  const fxLabel = fxIsEstimate ? "고정환율 추정" : "ECB 기준";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <section className="flex flex-col border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Kimchi Premium · BTC</h2>
          <span className="text-[10px] text-navy-300">
            {formatRelativeTime(snapshot.updatedAt)} · 업비트·바이낸스
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={`font-mono text-4xl font-medium tracking-tight ${changeColor(
              btc?.kimchiPremium ?? null
            )}`}
          >
            {formatPercent(btc?.kimchiPremium ?? null)}
          </p>
          {kimchiSig && (
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${toneClass(
                kimchiSig.tone
              )}`}
            >
              {kimchiSig.label}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-ink-500">
          업비트 {formatKrw(btc?.priceKrw ?? null)}원 · 바이낸스 ${btc?.priceUsd?.toLocaleString() ?? "–"} · 환율{" "}
          {snapshot.usdKrw.toLocaleString()}{" "}
          <span className={fxIsEstimate ? "font-semibold text-red-600" : "text-navy-300"}>
            ({fxLabel})
          </span>
        </p>

        {/* 프리미엄 분해 — USDT 베이시스 + BTC 잔여 */}
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <p className="rail">프리미엄 분해</p>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-500">
              USDT 베이시스 <span className="text-navy-300">· 원화 자금</span>
            </span>
            <span className="flex items-center gap-1.5">
              {usdtSig && (
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-medium ${toneClass(usdtSig.tone)}`}
                >
                  {usdtSig.label}
                </span>
              )}
              <span className={`font-mono font-semibold ${changeColor(usdtBasis)}`}>
                {formatPercent(usdtBasis)}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-500">
              BTC 잔여 <span className="text-navy-300">· 코인 고유</span>
            </span>
            <span className={`font-mono font-semibold ${changeColor(btcResidual)}`}>
              {formatPercent(btcResidual)}
            </span>
          </div>
        </div>

        {/* 환율 지난 6일 — 카드 하단 정렬 */}
        <div className="mt-auto border-t border-line pt-3">
          <div className="grid grid-cols-6 gap-1">
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
          <p className="rail mt-2">
            {fxIsEstimate ? (
              <span className="text-red-600">⚠ 환율 일시 추정 · 김프 정확도 주의</span>
            ) : (
              "환율 USD/KRW · 최근 6영업일"
            )}
          </p>
        </div>
      </section>

      <section className="flex flex-col border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">BTC Dominance</h2>
          <span className="text-[10px] text-navy-300">
            {formatRelativeTime(overview.updatedAt)} · CoinGecko
          </span>
        </div>
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
        <div className="mt-auto border-t border-line pt-3">
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

      <section className="flex flex-col border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">Fear &amp; Greed Index</h2>
          <span className="text-[10px] text-navy-300">일 1회 갱신</span>
        </div>
        {latestFng ? (
          <>
            <div className="mt-1 flex justify-center">
              <FngGauge value={latestFng.value} label={fngLabelKo(latestFng.classification)} />
            </div>
            {fngSig && (
              <div className="mt-1 flex justify-center">
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${toneClass(
                    fngSig.tone
                  )}`}
                >
                  {fngSig.label}
                </span>
              </div>
            )}
            {/* 지난 6일 — 수치만 작게, 카드 하단 정렬 */}
            <div className="mt-auto grid grid-cols-6 gap-1 border-t border-line pt-3">
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
            <p className="rail mt-2">지난 6일 · BTC 기준 · Alternative.me</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
        )}
      </section>
    </div>
  );
}
