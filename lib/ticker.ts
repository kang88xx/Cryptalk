export type Ticker = {
  symbol: string;
  name: string;
  priceKrw: number | null;
  priceUsd: number | null;
  change24h: number | null; // 업비트 기준 24h 변동률 (%)
  volumeKrw24h: number | null;
  kimchiPremium: number | null; // %
};

export type TickerSnapshot = {
  tickers: Ticker[];
  usdKrw: number;
  updatedAt: string;
};

const COINS = [
  { symbol: "BTC", name: "비트코인", upbit: "KRW-BTC", binance: "BTCUSDT" },
  { symbol: "ETH", name: "이더리움", upbit: "KRW-ETH", binance: "ETHUSDT" },
  { symbol: "XRP", name: "리플", upbit: "KRW-XRP", binance: "XRPUSDT" },
  { symbol: "SOL", name: "솔라나", upbit: "KRW-SOL", binance: "SOLUSDT" },
  { symbol: "ADA", name: "에이다", upbit: "KRW-ADA", binance: "ADAUSDT" },
  { symbol: "DOGE", name: "도지코인", upbit: "KRW-DOGE", binance: "DOGEUSDT" },
  { symbol: "TRX", name: "트론", upbit: "KRW-TRX", binance: "TRXUSDT" },
  { symbol: "ETC", name: "이더리움클래식", upbit: "KRW-ETC", binance: "ETCUSDT" },
  { symbol: "BCH", name: "비트코인캐시", upbit: "KRW-BCH", binance: "BCHUSDT" },
];

const TTL_MS = 10_000;
const FX_TTL_MS = 10 * 60_000;
const FALLBACK_USD_KRW = 1380;

let cache: { data: TickerSnapshot; at: number } | null = null;
let fxCache: { rate: number; at: number } | null = null;
let inflight: Promise<TickerSnapshot> | null = null;

async function fetchJson<T>(url: string, timeoutMs = 5000): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchUsdKrw(): Promise<number> {
  if (fxCache && Date.now() - fxCache.at < FX_TTL_MS) return fxCache.rate;
  try {
    const data = await fetchJson<{ rates: { KRW: number } }>(
      "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW"
    );
    const rate = data.rates?.KRW;
    if (rate && rate > 0) {
      fxCache = { rate, at: Date.now() };
      return rate;
    }
  } catch {
    // 환율 API 실패 시 직전 캐시 → 고정 환율 순서로 폴백
  }
  return fxCache?.rate ?? FALLBACK_USD_KRW;
}

type UpbitTicker = {
  market: string;
  trade_price: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
};

type BinanceTicker = { symbol: string; lastPrice: string };

async function fetchSnapshot(): Promise<TickerSnapshot> {
  const upbitUrl = `https://api.upbit.com/v1/ticker?markets=${COINS.map((c) => c.upbit).join(",")}`;
  const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
    JSON.stringify(COINS.map((c) => c.binance))
  )}`;

  const [upbitRes, binanceRes, usdKrw] = await Promise.all([
    fetchJson<UpbitTicker[]>(upbitUrl).catch(() => null),
    fetchJson<BinanceTicker[]>(binanceUrl).catch(() => null),
    fetchUsdKrw(),
  ]);

  const upbitMap = new Map(upbitRes?.map((t) => [t.market, t]) ?? []);
  const binanceMap = new Map(binanceRes?.map((t) => [t.symbol, t]) ?? []);

  const tickers: Ticker[] = COINS.map((coin) => {
    const up = upbitMap.get(coin.upbit);
    const bn = binanceMap.get(coin.binance);
    const priceKrw = up?.trade_price ?? null;
    const priceUsd = bn ? parseFloat(bn.lastPrice) : null;
    const kimchiPremium =
      priceKrw != null && priceUsd != null && priceUsd > 0
        ? (priceKrw / (priceUsd * usdKrw) - 1) * 100
        : null;
    return {
      symbol: coin.symbol,
      name: coin.name,
      priceKrw,
      priceUsd,
      change24h: up != null ? up.signed_change_rate * 100 : null,
      volumeKrw24h: up?.acc_trade_price_24h ?? null,
      kimchiPremium,
    };
  });

  return { tickers, usdKrw, updatedAt: new Date().toISOString() };
}

const KIMP_RECORD_INTERVAL_MS = 5 * 60_000;
let lastKimpRecordAt = 0;

async function maybeRecordKimpSnapshot(snapshot: TickerSnapshot): Promise<void> {
  if (Date.now() - lastKimpRecordAt < KIMP_RECORD_INTERVAL_MS) return;
  const btc = snapshot.tickers.find((t) => t.symbol === "BTC");
  if (btc?.kimchiPremium == null || btc.priceKrw == null || btc.priceUsd == null) return;
  lastKimpRecordAt = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.kimpSnapshot.create({
      data: {
        btcKrw: btc.priceKrw,
        btcUsd: btc.priceUsd,
        usdKrw: snapshot.usdKrw,
        kimp: btc.kimchiPremium,
      },
    });
  } catch {
    // 기록 실패는 시세 응답에 영향을 주지 않음
  }
}

export async function getTickers(): Promise<TickerSnapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!inflight) {
    inflight = fetchSnapshot()
      .then((data) => {
        cache = { data, at: Date.now() };
        void maybeRecordKimpSnapshot(data);
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
    return { tickers: [], usdKrw: FALLBACK_USD_KRW, updatedAt: new Date().toISOString() };
  }
}
