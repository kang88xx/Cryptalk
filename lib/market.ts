import { cachedJson } from "@/lib/cache";

export type FngPoint = {
  value: number;
  classification: string;
  date: string; // ISO
};

export type MarketOverview = {
  btcDominance: number | null;
  totalMarketCapUsd: number | null;
  marketCapChange24h: number | null;
  fearGreed: FngPoint[] | null; // 과거 → 현재 순
  updatedAt: string;
};

const TTL_MS = 5 * 60_000;

async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

type CoinGeckoGlobal = {
  data: {
    market_cap_percentage: { btc: number };
    total_market_cap: { usd: number };
    market_cap_change_percentage_24h_usd: number;
  };
};

type FngResponse = {
  data: { value: string; value_classification: string; timestamp: string }[];
};

async function fetchOverview(): Promise<MarketOverview> {
  const [global, fng] = await Promise.all([
    fetchJson<CoinGeckoGlobal>("https://api.coingecko.com/api/v3/global").catch(() => null),
    fetchJson<FngResponse>("https://api.alternative.me/fng/?limit=30").catch(() => null),
  ]);
  // 양쪽 모두 실패하면 throw — 캐시의 직전 정상값 보존(빈 데이터로 덮어쓰지 않음)
  if (!global && !fng) throw new Error("market overview unavailable");

  const fearGreed =
    fng?.data
      ?.map((d) => ({
        value: parseInt(d.value, 10),
        classification: d.value_classification,
        date: new Date(parseInt(d.timestamp, 10) * 1000).toISOString(),
      }))
      .reverse() ?? null;

  return {
    btcDominance: global?.data?.market_cap_percentage?.btc ?? null,
    totalMarketCapUsd: global?.data?.total_market_cap?.usd ?? null,
    marketCapChange24h: global?.data?.market_cap_change_percentage_24h_usd ?? null,
    fearGreed,
    updatedAt: new Date().toISOString(),
  };
}

export async function getMarketOverview(): Promise<MarketOverview> {
  try {
    return await cachedJson("overview", TTL_MS, fetchOverview);
  } catch {
    return {
      btcDominance: null,
      totalMarketCapUsd: null,
      marketCapChange24h: null,
      fearGreed: null,
      updatedAt: new Date(0).toISOString(),
    };
  }
}

// 환율 최근 추이 — 영업일 기준 마지막 6개
export type FxPoint = { date: string; rate: number };

// USD/KRW 일별 환율 — Yahoo Finance(KRW=X)를 우선 사용.
// ECB(Frankfurter)는 CET 16시 발표라 당일 값이 늦지만, Yahoo는 당일 실시간까지 포함 → 마지막 날짜가 "오늘"로 표시됨.
async function fetchFxHistoryYahoo(): Promise<FxPoint[]> {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=1mo",
    {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    }
  );
  if (!res.ok) throw new Error(`yahoo KRW=X -> ${res.status}`);
  const data = (await res.json()) as {
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[] };
      }[];
    };
  };
  const r = data?.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const points = ts
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), rate: closes[i] ?? 0 }))
    .filter((p) => p.rate > 0)
    .slice(-7); // 표시는 6일, 1일치 더 받아 첫 타일의 전일 대비 등락 계산용
  if (points.length === 0) throw new Error("yahoo fx history empty");
  return points;
}

// 폴백 — Yahoo 실패 시 ECB(Frankfurter, 영업일 1회 발표)
async function fetchFxHistoryEcb(): Promise<FxPoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 12 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const data = await fetchJson<{ rates: Record<string, { KRW: number }> }>(
    `https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(end)}?base=USD&symbols=KRW`
  );
  const points = Object.entries(data.rates ?? {})
    .map(([date, r]) => ({ date, rate: r.KRW }))
    .filter((p) => p.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  if (points.length === 0) throw new Error("fx history empty");
  return points;
}

async function fetchFxHistory(): Promise<FxPoint[]> {
  try {
    return await fetchFxHistoryYahoo();
  } catch {
    return fetchFxHistoryEcb();
  }
}

export async function getFxHistory(): Promise<FxPoint[]> {
  try {
    return await cachedJson("fxHistory", 60 * 60_000, fetchFxHistory);
  } catch {
    return [];
  }
}


export function fngLabelKo(classification: string): string {
  switch (classification) {
    case "Extreme Fear":
      return "극단적 공포";
    case "Fear":
      return "공포";
    case "Neutral":
      return "중립";
    case "Greed":
      return "탐욕";
    case "Extreme Greed":
      return "극단적 탐욕";
    default:
      return classification;
  }
}

// ── 버블맵: 시총 상위 N + 기간별 변동률 (CoinGecko 단일 호출) ──
export type BubbleCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceUsd: number | null;
  marketCap: number | null;
  marketCapRank: number | null; // ← "어떤 100개가 보이나"의 기준
  volume24h: number | null;
  // 버블 크기·색의 기준이 되는 값들 (기간 토글용)
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change1y: number | null;
};

export type BubbleSnapshot = {
  coins: BubbleCoin[];
  updatedAt: string;
};

type CGMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  price_change_percentage_1y_in_currency: number | null;
};

const BUBBLES_TTL_MS = 5 * 60_000; // /global 과 동일 톤(분 단위) — 시총 랭킹은 초단위 갱신 불필요

async function fetchBubbles(): Promise<BubbleSnapshot> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd&order=market_cap_desc&per_page=100&page=1" +
    "&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C30d%2C1y";
  // 빈 배열이면 throw → cachedJson 이 캐시의 직전 정상값을 보존(빈 데이터로 안 덮음)
  const rows = await fetchJson<CGMarket[]>(url, 8000);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("coingecko markets empty");

  const coins: BubbleCoin[] = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol.toUpperCase(),
    name: r.name,
    image: r.image,
    priceUsd: r.current_price ?? null,
    marketCap: r.market_cap ?? null,
    marketCapRank: r.market_cap_rank ?? null,
    volume24h: r.total_volume ?? null,
    change1h: r.price_change_percentage_1h_in_currency ?? null,
    change24h: r.price_change_percentage_24h_in_currency ?? null,
    change7d: r.price_change_percentage_7d_in_currency ?? null,
    change30d: r.price_change_percentage_30d_in_currency ?? null,
    change1y: r.price_change_percentage_1y_in_currency ?? null,
  }));

  return { coins, updatedAt: new Date().toISOString() };
}

export async function getBubbles(): Promise<BubbleSnapshot> {
  try {
    return await cachedJson("bubbles", BUBBLES_TTL_MS, fetchBubbles);
  } catch {
    return { coins: [], updatedAt: new Date(0).toISOString() };
  }
}
