// @shrimp_notice 텔레그램 공개 채널 → 바이낸스 선물(USDⓈ-M/COIN-M) 신규 상장만 추출
// 봇/로그인 없이 t.me/s 웹 미리보기를 30분 간격으로 스크래핑

import { cachedJson } from "@/lib/cache";

export type Listing = {
  id: string; // 메시지 고유 (t.me 링크 끝 번호)
  symbol: string | null; // 예: XYZ (USDT/USDC 선물 페어에서 추출)
  detail: string; // 정리된 공지 제목 (예: "Binance Futures Will Launch USDⓈ-M XYZUSDT Perpetual Contract")
  text: string; // 디코딩된 원문 한 줄
  url: string | null; // 텔레그램 메시지 링크
  date: string; // ISO (UTC) — 텔레그램 게시 시각
  scheduledAt: string | null; // 상장 예정 시각 (채널이 시각을 제공하지 않아 항상 null)
};

const CHANNEL = "shrimp_notice";
const SRC_URL = `https://t.me/s/${CHANNEL}`;
const TTL_MS = 30 * 60_000; // 30분에 한 번만 실제 스크래핑
const RECENT_MS = 7 * 86400_000; // 최근 7일
const MAX_ITEMS = 8;

// 바이낸스 선물 "신규 상장" 공지만 (Will List / Will Launch). End·Settle·Delist 등은 제외됨.
const FUTURES_LISTING_RE = /Binance Futures Will (List|Launch)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#0*36;/g, "$")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseListings(html: string): Listing[] {
  const out: Listing[] = [];
  const re = /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeEntities(m[1]);
    if (!text || !FUTURES_LISTING_RE.test(text)) continue; // 바이낸스 선물 상장만

    const after = html.slice(re.lastIndex, re.lastIndex + 4000);
    const dt = after.match(/datetime="([^"]+)"/)?.[1] ?? null;
    const link = after.match(/href="(https:\/\/t\.me\/[^"]+\/(\d+))"/);

    // 제목 정리: 앞 "거래소(Exchange) 공지[변경] " 제거 + 끝 타임스탬프 제거
    const detail = text
      .replace(/^.*?공지(?:변경)?\s*/, "")
      .replace(/\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*$/, "")
      .trim();

    // 심볼: USDT/USDC 선물 페어 앞 토큰 (예: 1000XYZUSDT → 1000XYZ). Quarterly/Delivery 등은 null.
    const symbol = detail.match(/\b(\d{0,4}[A-Z][A-Z0-9]{1,14})(?:USDT|USDC|USD)\b/)?.[1] ?? null;

    out.push({
      id: link?.[2] ?? `${out.length}`,
      symbol,
      detail,
      text,
      url: link?.[1] ?? null,
      date: dt ? new Date(dt).toISOString() : new Date().toISOString(),
      scheduledAt: null,
    });
  }
  return out;
}

async function scrape(): Promise<{ listings: Listing[]; updatedAt: string }> {
  const res = await fetch(SRC_URL, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`${SRC_URL} -> ${res.status}`);
  const html = await res.text();

  const cutoff = Date.now() - RECENT_MS;
  const listings = parseListings(html)
    .filter((l) => new Date(l.date).getTime() >= cutoff) // 최근 7일
    .sort((a, b) => b.date.localeCompare(a.date)) // 최신순
    .slice(0, MAX_ITEMS);

  return { listings, updatedAt: new Date().toISOString() };
}

// 최근 바이낸스 선물 신규 상장 — DB 공유 캐시(30분)
export async function getTodayListings(): Promise<{ listings: Listing[]; updatedAt: string }> {
  try {
    return await cachedJson("listings", TTL_MS, scrape);
  } catch {
    return { listings: [], updatedAt: new Date(0).toISOString() };
  }
}
