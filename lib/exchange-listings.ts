// 4개 거래소(업비트·바이낸스·빗썸·코인베이스)의 '현물 상장 종목' 집합.
// "지금 봐야 할 코인" 레이더에서, 이미 여러 거래소에 상장된 코인이 아직 빠진 거래소가 있으면
// "○○ 상장 가능성"으로 표기하기 위한 데이터(교차상장 수렴 신호). 모든 소스는 공개 현물 API(키 불필요).

import { cachedJson } from "@/lib/cache";
import { fetchJson } from "@/lib/http";

export type ListingExchange = "Upbit" | "Binance" | "Bithumb" | "Coinbase";
export const LISTING_EXCHANGES: ListingExchange[] = ["Upbit", "Binance", "Bithumb", "Coinbase"];

export const EX_KO: Record<ListingExchange, string> = {
  Upbit: "업비트",
  Binance: "바이낸스",
  Bithumb: "빗썸",
  Coinbase: "코인베이스",
};

const LISTINGS_TTL_MS = 6 * 3600_000; // 상장 목록은 자주 안 바뀜 — 6시간 캐시

// ── 거래소별 현물 상장 base 심볼 집합 ──

// 업비트: 전체 마켓(KRW/BTC/USDT) → base 심볼. 예: KRW-BTC → BTC
async function fetchUpbitSymbols(): Promise<string[]> {
  try {
    const rows = await fetchJson<{ market: string }[]>("https://api.upbit.com/v1/market/all", 7000);
    const set = new Set<string>();
    for (const r of rows) {
      const base = r.market.split("-")[1];
      if (base) set.add(base.toUpperCase());
    }
    return [...set];
  } catch {
    return [];
  }
}

// 빗썸: 전체 KRW 마켓 → 키가 base 심볼
async function fetchBithumbSymbols(): Promise<string[]> {
  try {
    const res = await fetchJson<{ status: string; data: Record<string, unknown> }>(
      "https://api.bithumb.com/public/ticker/ALL_KRW",
      7000
    );
    if (res?.status !== "0000" || !res.data) return [];
    return Object.keys(res.data)
      .filter((s) => s !== "date")
      .map((s) => s.toUpperCase());
  } catch {
    return [];
  }
}

// 바이낸스: 현물 전체가 → USDT 페어의 base 심볼(= 현물 상장)
async function fetchBinanceSymbols(): Promise<string[]> {
  try {
    const rows = await fetchJson<{ symbol: string }[]>(
      "https://api.binance.com/api/v3/ticker/price",
      7000
    );
    const set = new Set<string>();
    for (const r of rows) {
      if (r.symbol.endsWith("USDT")) set.add(r.symbol.slice(0, -4).toUpperCase());
    }
    return [...set];
  } catch {
    return [];
  }
}

// 코인베이스: 거래 상품 목록 → online 상태의 base_currency
async function fetchCoinbaseSymbols(): Promise<string[]> {
  try {
    const res = await fetch("https://api.exchange.coinbase.com/products", {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { base_currency?: string; status?: string }[];
    const set = new Set<string>();
    for (const r of Array.isArray(rows) ? rows : []) {
      if (r.status === "online" && r.base_currency) set.add(r.base_currency.toUpperCase());
    }
    return [...set];
  } catch {
    return [];
  }
}

export type ExchangeListingSets = Record<ListingExchange, string[]>;

async function fetchListingSets(): Promise<ExchangeListingSets> {
  const [Upbit, Binance, Bithumb, Coinbase] = await Promise.all([
    fetchUpbitSymbols(),
    fetchBinanceSymbols(),
    fetchBithumbSymbols(),
    fetchCoinbaseSymbols(),
  ]);
  const sets: ExchangeListingSets = { Upbit, Binance, Bithumb, Coinbase };
  // 두 곳 이상 비면 신뢰 불가 → throw로 직전 캐시 보존(빈 데이터로 안 덮음)
  if (LISTING_EXCHANGES.filter((e) => sets[e].length === 0).length >= 2) {
    throw new Error("listing sources unavailable");
  }
  return sets;
}

// 4거래소 현물 상장 심볼 집합(6시간 캐시). 실패 시 빈 배열 → 가능성 칩이 안 뜰 뿐, 레이더는 정상.
export async function getExchangeListingSets(): Promise<ExchangeListingSets> {
  try {
    return await cachedJson("exchange-listing-sets", LISTINGS_TTL_MS, fetchListingSets);
  } catch {
    return { Upbit: [], Binance: [], Bithumb: [], Coinbase: [] };
  }
}

// 심볼이 '이미 2곳 이상 메이저에 상장'됐는데 아직 빠진 거래소가 있으면 그 거래소들을 반환(교차상장 신호).
// 한 곳에만 상장된 코인은 신호가 약해 제외(노이즈 방지).
export function listingGapsFor(symbol: string, sets: ExchangeListingSets): ListingExchange[] {
  const s = symbol.toUpperCase();
  const listed = LISTING_EXCHANGES.filter((e) => sets[e].includes(s));
  if (listed.length < 2) return [];
  return LISTING_EXCHANGES.filter((e) => sets[e].length > 0 && !sets[e].includes(s));
}
