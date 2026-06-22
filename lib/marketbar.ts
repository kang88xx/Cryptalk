import { cachedJson } from "@/lib/cache";

// 상단 마켓바 — 주가지수·원자재 미니차트 타일 (나스닥·코스피·코스닥·금)
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


// 표시 대상 — 나스닥·코스피·코스닥·금 (그 외 지표·코인 타일 제거)
const YAHOO: { key: string; label: string; symbol: string; prefix?: string; digits?: number }[] = [
  { key: "nasdaq", label: "나스닥", symbol: "^IXIC", digits: 2 },
  { key: "kospi", label: "코스피", symbol: "^KS11", digits: 2 },
  { key: "kosdaq", label: "코스닥", symbol: "^KQ11", digits: 2 },
  { key: "gold", label: "금(Gold)", symbol: "GC=F", prefix: "$", digits: 1 },
];

async function fetchMarketBar(): Promise<MarketBarData> {
  const yh = await Promise.all(YAHOO.map((y) => fetchYahooSeries(y.symbol)));

  const tiles: BarTile[] = [];
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
