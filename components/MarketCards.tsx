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

// 큰 지표 숫자 — Pretendard 라이트 + 앰버 밑줄 (Claude Design: Market Cards)
function BigStat({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-block">
      <span className="font-sans text-[clamp(44px,8vw,60px)] font-light leading-[0.9] tracking-[-0.04em] tabular-nums text-navy-900">
        {children}
      </span>
      <span className="absolute inset-x-0 -bottom-1.5 h-1 bg-amber-500" />
    </div>
  );
}

// 카드 상단 넘버링 eyebrow
function CardHead({ no, title, meta }: { no: string; title: string; meta: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <span className="font-mono text-[11px] tracking-[0.16em] text-navy-500 uppercase">
        {no} · {title}
      </span>
      <span className="font-mono text-[10px] tracking-[0.12em] text-navy-300 uppercase">{meta}</span>
    </div>
  );
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

  const premium = (krw: number | null, base: number | null) =>
    krw != null && base != null && base > 0 ? (krw / base - 1) * 100 : null;

  // 김프 분해 (이중계산 방지): usdtBasis × btcResidual = 전통 김프
  const usdtBasis = premium(exchanges.usdtUpbit, snapshot.usdKrw);
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
      {/* 01 · KIMCHI PREMIUM */}
      <section className="flex flex-col border border-line bg-white p-7 transition-colors hover:border-navy-300">
        <CardHead no="01" title="Kimchi Premium" meta={`${formatRelativeTime(snapshot.updatedAt)} · 업비트·바이낸스`} />

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <BigStat>{formatPercent(btc?.kimchiPremium ?? null)}</BigStat>
          {kimchiSig && (
            <span className={`rounded px-2 py-1 text-[11px] font-semibold ${toneClass(kimchiSig.tone)}`}>
              {kimchiSig.label}
            </span>
          )}
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
          업비트 <span className="font-mono text-ink-700">{formatKrw(btc?.priceKrw ?? null)}원</span> · 바이낸스{" "}
          <span className="font-mono text-ink-700">${btc?.priceUsd?.toLocaleString() ?? "–"}</span> · 환율{" "}
          <span className="font-mono text-ink-700">{snapshot.usdKrw.toLocaleString()}</span>{" "}
          <span className={fxIsEstimate ? "font-semibold text-red-600" : "text-navy-300"}>({fxLabel})</span>
        </p>

        <div className="mt-6 mb-4 h-px bg-line" />

        {/* 프리미엄 분해 */}
        <p className="mb-3 font-sans text-sm font-semibold text-navy-900">프리미엄 분해</p>
        <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
          <span className="text-ink-700">
            USDT 베이시스 <span className="text-ink-300">· 원화 자금</span>
          </span>
          <span className="flex items-center gap-2">
            {usdtSig && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${toneClass(usdtSig.tone)}`}>
                {usdtSig.label}
              </span>
            )}
            <span className={`font-mono text-[15px] tabular-nums ${changeColor(usdtBasis)}`}>
              {formatPercent(usdtBasis)}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
          <span className="text-ink-700">
            BTC 잔여 <span className="text-ink-300">· 코인 고유</span>
          </span>
          <span className={`font-mono text-[15px] tabular-nums ${changeColor(btcResidual)}`}>
            {formatPercent(btcResidual)}
          </span>
        </div>

        {/* 환율 지난 6일 */}
        <div className="mt-6 grid grid-cols-6 gap-1.5">
          {fxHistory.map((p) => {
            const d = new Date(p.date + "T00:00:00Z");
            return (
              <div key={p.date} className="border border-line bg-paper px-1 py-2 text-center">
                <p className="font-mono text-[10px] text-ink-300">
                  {d.getUTCMonth() + 1}/{d.getUTCDate()}
                </p>
                <p className="mt-0.5 font-mono text-[13px] tabular-nums text-navy-900">
                  {Math.round(p.rate).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-auto pt-4 font-mono text-[10px] tracking-[0.14em] text-navy-400 uppercase">
          {fxIsEstimate ? (
            <span className="text-red-600">⚠ 환율 일시 추정 · 김프 정확도 주의</span>
          ) : (
            "환율 USD/KRW · 최근 6영업일"
          )}
        </p>
      </section>

      {/* 02 · BTC DOMINANCE */}
      <section className="flex flex-col border border-line bg-white p-7 transition-colors hover:border-navy-300">
        <CardHead no="02" title="BTC Dominance" meta={`${formatRelativeTime(overview.updatedAt)} · CoinGecko`} />

        <BigStat>{overview.btcDominance != null ? `${overview.btcDominance.toFixed(1)}%` : "–"}</BigStat>

        <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
          전체 시가총액{" "}
          <span className="font-mono text-ink-700">
            {overview.totalMarketCapUsd != null ? `$${(overview.totalMarketCapUsd / 1e12).toFixed(2)}T` : "–"}
          </span>{" "}
          <span className={`font-mono ${changeColor(overview.marketCapChange24h)}`}>
            ({formatPercent(overview.marketCapChange24h)} 24h)
          </span>
        </p>

        <div className="mt-4 flex flex-1 items-end">
          <Sparkline
            values={domHistory.map((s) => s.btcDominance)}
            width={300}
            height={140}
            stroke="#091955"
            accentRing="#EFC540"
          />
        </div>
        <p className="mt-2 border-t border-line pt-4 font-mono text-[10px] tracking-[0.14em] text-navy-400 uppercase">
          도미넌스 추이 · 15min · {domHistory.length} samples ·{" "}
          <a
            href="https://www.coingecko.com/en/global-charts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            CoinGecko ↗
          </a>
        </p>
      </section>

      {/* 03 · FEAR & GREED */}
      <section className="flex flex-col border border-line bg-white p-7 transition-colors hover:border-navy-300">
        <CardHead no="03" title="Fear &amp; Greed" meta="Daily" />
        {latestFng ? (
          <>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[300px]">
                <FngGauge value={latestFng.value} label={fngLabelKo(latestFng.classification)} />
              </div>
              {fngSig && (
                <span className={`mt-2 rounded px-2 py-1 text-[11px] font-semibold ${toneClass(fngSig.tone)}`}>
                  {fngSig.label}
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-6 gap-1.5">
              {overview.fearGreed!.slice(-7, -1).map((p) => {
                const d = new Date(p.date);
                return (
                  <div key={p.date} className="border border-line bg-paper px-1 py-2 text-center">
                    <p className="font-mono text-[10px] text-ink-300">
                      {d.getUTCMonth() + 1}/{d.getUTCDate()}
                    </p>
                    <p className={`mt-0.5 font-mono text-[13px] tabular-nums ${fngColor(p.value)}`}>{p.value}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-auto pt-4 font-mono text-[10px] tracking-[0.14em] text-navy-400 uppercase">
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
