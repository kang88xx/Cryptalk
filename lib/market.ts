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

async function fetchFxHistory(): Promise<FxPoint[]> {
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
    .slice(-6);
  if (points.length === 0) throw new Error("fx history empty");
  return points;
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
