import { cachedJson } from "@/lib/cache";

// 글로벌·국내 주가지수 — 상단 배너용 (나스닥/코스피/코스닥)
export type IndexQuote = { label: string; value: number; changePct: number | null };
export type Indices = { items: IndexQuote[]; updatedAt: string };

const TTL_MS = 5 * 60_000;
const SYMBOLS: { label: string; symbol: string }[] = [
  { label: "나스닥", symbol: "^IXIC" },
  { label: "코스피", symbol: "^KS11" },
  { label: "코스닥", symbol: "^KQ11" },
];

async function fetchYahoo(symbol: string): Promise<{ price: number; prev: number } | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=1d&range=1d`,
      {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number } }[] };
    };
    const m = d?.chart?.result?.[0]?.meta;
    const price = m?.regularMarketPrice;
    if (typeof price !== "number" || !Number.isFinite(price)) return null;
    const prevRaw = m?.chartPreviousClose ?? m?.previousClose;
    const prev = typeof prevRaw === "number" && Number.isFinite(prevRaw) ? prevRaw : price;
    return { price, prev };
  } catch {
    return null;
  }
}

async function fetchIndices(): Promise<Indices> {
  const results = await Promise.all(SYMBOLS.map((s) => fetchYahoo(s.symbol)));
  const items: IndexQuote[] = SYMBOLS.map((s, i) => {
    const r = results[i];
    return {
      label: s.label,
      value: r ? r.price : NaN,
      changePct: r && r.prev > 0 ? ((r.price - r.prev) / r.prev) * 100 : null,
    };
  }).filter((x) => Number.isFinite(x.value));
  if (items.length === 0) throw new Error("indices unavailable"); // 캐시 보존
  return { items, updatedAt: new Date().toISOString() };
}

export async function getIndices(): Promise<Indices> {
  try {
    return await cachedJson("indices", TTL_MS, fetchIndices);
  } catch {
    return { items: [], updatedAt: new Date(0).toISOString() };
  }
}
