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
let cache: { data: MarketOverview; at: number } | null = null;
let inflight: Promise<MarketOverview> | null = null;

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
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!inflight) {
    inflight = fetchOverview()
      .then((data) => {
        cache = { data, at: Date.now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch {
    if (cache) return cache.data;
    return {
      btcDominance: null,
      totalMarketCapUsd: null,
      marketCapChange24h: null,
      fearGreed: null,
      updatedAt: new Date().toISOString(),
    };
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
