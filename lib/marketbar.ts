import { cachedJson } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { getMarketOverview } from "@/lib/market";

// CoinMarketCal 스타일 상단 마켓바 — 미니차트 타일 (크립토·주가지수·원자재/환율·코인)
export type BarTile = {
  key: string;
  label: string;
  value: string; // 표시용 포맷된 값
  changePct: number | null;
  spark: number[]; // 미니 스파크라인 시리즈
};
export type MarketBarData = { tiles: BarTile[]; updatedAt: string };

const TTL_MS = 5 * 60_000;

// ── Yahoo Finance (지수·원자재·환율) — 값 + 전일종가 + 스파크라인 ──
async function fetchYahooSeries(
  symbol: string
): Promise<{ price: number; prev: number; spark: number[] } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=1d&range=1mo`,
      {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      chart?: {
        result?: {
          meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[];
      };
    };
    const r = d?.chart?.result?.[0];
    const price = r?.meta?.regularMarketPrice;
    if (typeof price !== "number" || !Number.isFinite(price)) return null;
    const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number" && Number.isFinite(c)
    );
    // 일간 변동: 직전 거래일 종가 사용 (range=1mo의 chartPreviousClose는 한 달 전이라 부정확)
    const prevRaw = r?.meta?.chartPreviousClose;
    const prev =
      closes.length >= 2
        ? closes[closes.length - 2]
        : typeof prevRaw === "number" && prevRaw > 0
        ? prevRaw
        : price;
    return { price, prev, spark: closes.slice(-24) };
  } catch {
    return null;
  }
}

type CgCoin = {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  sparkline_in_7d?: { price?: number[] };
};

const STABLES = new Set(["usdt", "usdc", "dai", "fdusd", "usde", "tusd", "usds", "pyusd"]);

async function fetchCgMarkets(): Promise<CgCoin[]> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=true&price_change_percentage=24h,30d",
    { signal: AbortSignal.timeout(7000), cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`coingecko markets ${res.status}`);
  return (await res.json()) as CgCoin[];
}

// 알트시즌 근사: 시총 상위(스테이블·BTC 제외) 중 30일 수익률이 BTC를 앞선 비율(%)
function altSeasonIndex(coins: CgCoin[]): number | null {
  const btc = coins.find((c) => c.symbol.toLowerCase() === "btc");
  const btc30 = btc?.price_change_percentage_30d_in_currency;
  if (btc30 == null) return null;
  const universe = coins
    .filter((c) => c.symbol.toLowerCase() !== "btc" && !STABLES.has(c.symbol.toLowerCase()))
    .filter((c) => c.price_change_percentage_30d_in_currency != null)
    .slice(0, 50);
  if (universe.length === 0) return null;
  const out = universe.filter((c) => (c.price_change_percentage_30d_in_currency as number) > btc30).length;
  return Math.round((out / universe.length) * 100);
}

const YAHOO: { key: string; label: string; symbol: string; prefix?: string; digits?: number }[] = [
  { key: "nasdaq", label: "나스닥", symbol: "^IXIC", digits: 2 },
  { key: "kospi", label: "코스피", symbol: "^KS11", digits: 2 },
  { key: "kosdaq", label: "코스닥", symbol: "^KQ11", digits: 2 },
  { key: "gold", label: "금(Gold)", symbol: "GC=F", prefix: "$", digits: 1 },
  { key: "dxy", label: "달러(DXY)", symbol: "DX-Y.NYB", digits: 2 },
  { key: "usdkrw", label: "환율 USD/KRW", symbol: "KRW=X", digits: 1 },
];

async function fetchMarketBar(): Promise<MarketBarData> {
  const [overview, snaps, cg, ...yh] = await Promise.all([
    getMarketOverview(),
    prisma.marketSnapshot
      .findMany({ orderBy: { createdAt: "desc" }, take: 48, select: { btcDominance: true, totalMcapUsd: true } })
      .then((rows) => rows.reverse())
      .catch(() => []),
    fetchCgMarkets().catch(() => null),
    ...YAHOO.map((y) => fetchYahooSeries(y.symbol)),
  ]);

  const tiles: BarTile[] = [];
  const fng = overview.fearGreed?.at(-1) ?? null;

  // ── 크립토 지표 ──
  if (overview.totalMarketCapUsd != null) {
    tiles.push({
      key: "mcap",
      label: "시가총액",
      value: `$${(overview.totalMarketCapUsd / 1e12).toFixed(2)}T`,
      changePct: overview.marketCapChange24h,
      spark: snaps.map((s) => s.totalMcapUsd),
    });
  }
  if (overview.btcDominance != null) {
    tiles.push({
      key: "dom",
      label: "BTC 도미넌스",
      value: `${overview.btcDominance.toFixed(1)}%`,
      changePct: null,
      spark: snaps.map((s) => s.btcDominance),
    });
  }
  if (fng) {
    tiles.push({
      key: "fng",
      label: "공포탐욕",
      value: String(fng.value),
      changePct: null,
      spark: (overview.fearGreed ?? []).map((p) => p.value),
    });
  }
  const alt = cg ? altSeasonIndex(cg) : null;
  if (alt != null) {
    tiles.push({ key: "alt", label: "알트시즌", value: `${alt}`, changePct: null, spark: [] });
  }

  // ── 주가지수 · 원자재 · 환율 (S&P 제외) ──
  YAHOO.forEach((y, i) => {
    const r = yh[i];
    if (!r) return;
    tiles.push({
      key: y.key,
      label: y.label,
      value: `${y.prefix ?? ""}${r.price.toLocaleString(undefined, { maximumFractionDigits: y.digits ?? 2 })}`,
      changePct: r.prev > 0 ? ((r.price - r.prev) / r.prev) * 100 : null,
      spark: r.spark,
    });
  });

  // ── 주요 코인 (BTC · ETH) ──
  for (const sym of ["btc", "eth"]) {
    const c = cg?.find((x) => x.symbol.toLowerCase() === sym);
    if (!c) continue;
    tiles.push({
      key: sym,
      label: sym.toUpperCase(),
      value: `$${c.current_price.toLocaleString(undefined, { maximumFractionDigits: c.current_price >= 100 ? 0 : 2 })}`,
      changePct: c.price_change_percentage_24h,
      spark: (c.sparkline_in_7d?.price ?? []).filter((n) => Number.isFinite(n)).slice(-32),
    });
  }

  if (tiles.length === 0) throw new Error("market bar unavailable");
  return { tiles, updatedAt: new Date().toISOString() };
}

export async function getMarketBar(): Promise<MarketBarData> {
  try {
    return await cachedJson("marketbar", TTL_MS, fetchMarketBar);
  } catch {
    return { tiles: [], updatedAt: new Date(0).toISOString() };
  }
}
