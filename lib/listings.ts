// @NewListingsFeed 텔레그램 공개 채널 → 금일 신규 상장 중 "바이낸스 선물"만 추출
// 봇/로그인 없이 t.me/s 웹 미리보기를 30분 간격으로 스크래핑

import { lookup } from "node:dns/promises";
import { cachedJson } from "@/lib/cache";

// ── SSRF 방어 — 채널에서 파싱한 외부 URL은 공격자 제어 가능 ──
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // 링크로컬 / 클라우드 메타데이터(169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // 멀티캐스트/예약
  );
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::1" || s === "::") return true;
  if (/^fe[89ab]/.test(s)) return true; // 링크로컬 fe80::/10
  if (/^f[cd]/.test(s)) return true; // 유니크 로컬 fc00::/7
  const dotted = s.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return isPrivateIPv4(dotted[1]);
  const hex = s.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const n = ((parseInt(hex[1], 16) << 16) | parseInt(hex[2], 16)) >>> 0;
    return isPrivateIPv4(`${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`);
  }
  return false;
}

async function isSafePublicUrl(raw: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return !isPrivateIPv4(host);
  if (host.includes(":")) return false; // 원시 IPv6 리터럴 차단
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return false;
    return addrs.every((a) =>
      a.family === 6 ? !isPrivateIPv6(a.address) : !isPrivateIPv4(a.address)
    );
  } catch {
    return false;
  }
}

export type Listing = {
  id: string; // 메시지 고유 (t.me 링크 끝 번호)
  symbol: string | null; // 예: ZEST
  detail: string; // 예: "listed on Binance futures"
  text: string; // 디코딩된 원문 한 줄
  url: string | null; // 메시지/원문 링크
  date: string; // ISO (UTC) — 텔레그램 게시 시각
  scheduledAt: string | null; // ISO (UTC) — 원문에서 추출한 상장 예정 시각 (없으면 null=미정)
};

const CHANNEL = "NewListingsFeed";
const SRC_URL = `https://t.me/s/${CHANNEL}`;
const TTL_MS = 30 * 60_000; // 30분에 한 번만 실제 스크래핑

// 바이낸스 선물 상장만 (Binance + futures/perpetual). Binance alpha·spot, 타 거래소 제외.
const BINANCE_FUTURES_RE = /binance/i;
const FUTURES_RE = /futures|perpetual|perp\b/i;

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

// KST(UTC+9) 기준 YYYY-MM-DD
function kstDay(d: Date): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

function parseListings(html: string): Listing[] {
  const out: Listing[] = [];
  const re = /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const inner = m[1];
    const text = decodeEntities(inner);
    if (!text) continue;
    // 바이낸스 선물 상장만 노출
    if (!BINANCE_FUTURES_RE.test(text) || !FUTURES_RE.test(text)) continue;

    // 포스팅 본문 안의 원문 링크(거래소 공지·X 등) — 우선 사용
    const srcUrl = inner.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&") ?? null;
    const after = html.slice(re.lastIndex, re.lastIndex + 4000);
    const dt = after.match(/datetime="([^"]+)"/)?.[1] ?? null;
    const link = after.match(/href="(https:\/\/t\.me\/[^"]+\/(\d+))"/);
    const url = srcUrl ?? link?.[1] ?? null;
    const id = link?.[2] ?? `${out.length}`;
    const sym = text.match(/^\$?([A-Z0-9]{1,15})\b/)?.[1] ?? null;
    const detail = sym ? text.replace(/^\$?[A-Z0-9]{1,15}\s*/, "") : text;
    out.push({
      id,
      symbol: sym,
      detail,
      text,
      url,
      date: dt ? new Date(dt).toISOString() : new Date().toISOString(),
      scheduledAt: null,
    });
  }
  return out;
}

const MON: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// 원문 공지에서 상장 예정 시각(UTC)을 best-effort로 추출. 못 찾으면 null.
async function extractScheduledTime(url: string | null): Promise<string | null> {
  if (!url) return null;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  // X·트위터 등 JS 렌더 페이지는 정적으로 시각을 못 읽음 → 미정 처리
  if (/(^|\.)(x|twitter)\.com$/i.test(hostname)) return null;
  // SSRF 방어 — 사설/메타데이터로 해석되는 URL은 fetch하지 않음
  if (!(await isSafePublicUrl(url))) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      redirect: "manual", // 리다이렉트로 사설망 우회 방지
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const t = (await res.text())
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ");
    // 두 가지 어순 모두 대응
    const a = t.match(/([A-Z][a-z]{2,8})\.?\s+(\d{1,2}),?\s*(\d{4}),?\s+(\d{1,2}):(\d{2})\s*\(?UTC/);
    const b = t.match(/(\d{1,2}):(\d{2})\s*\(?UTC\)?\s+on\s+([A-Z][a-z]{2,8})\.?\s+(\d{1,2}),?\s*(\d{4})/);
    let y: number | undefined, mo: number | undefined, d: number, hh: number, mm: number;
    let idx = Infinity;
    if (a && a.index !== undefined && a.index < idx) {
      mo = MON[a[1].slice(0, 3).toLowerCase()]; d = +a[2]; y = +a[3]; hh = +a[4]; mm = +a[5]; idx = a.index;
    }
    if (b && b.index !== undefined && b.index < idx) {
      hh = +b[1]; mm = +b[2]; mo = MON[b[3].slice(0, 3).toLowerCase()]; d = +b[4]; y = +b[5]; idx = b.index;
    }
    if (idx === Infinity || mo == null || y == null) return null;
    return new Date(Date.UTC(y, mo, d!, hh!, mm!)).toISOString();
  } catch {
    return null;
  }
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
  const all = parseListings(html);
  const today = kstDay(new Date());
  const listings = all
    .filter((l) => kstDay(new Date(l.date)) === today)
    .sort((a, b) => b.date.localeCompare(a.date));
  // 원문에서 상장 예정 시각 추출 (병렬, 실패 시 null=미정)
  await Promise.all(
    listings.map(async (l) => {
      l.scheduledAt = await extractScheduledTime(l.url);
    })
  );
  return { listings, updatedAt: new Date().toISOString() };
}

// 금일(KST) 바이낸스 선물 신규 상장 — DB 공유 캐시(30분)
export async function getTodayListings(): Promise<{ listings: Listing[]; updatedAt: string }> {
  try {
    return await cachedJson("listings", TTL_MS, scrape);
  } catch {
    return { listings: [], updatedAt: new Date(0).toISOString() };
  }
}
