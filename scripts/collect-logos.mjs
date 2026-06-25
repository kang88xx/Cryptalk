// 로고 수집 스크립트 — 캘린더 이벤트 ticker + 거래소 로고를 public/logos/ 에 저장하고
// lib/logos.ts 매니페스트를 생성한다. 새 이벤트가 추가되면 다시 실행하면 된다.
//   node scripts/collect-logos.mjs
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(import.meta.dirname, "..");
const COINS_DIR = path.join(ROOT, "public/logos/coins");
const EX_DIR = path.join(ROOT, "public/logos/exchanges");

// 매크로/국가/특수 — 이모지로 표시되므로 로고 수집 제외 (EventIcon EMOJI_ICON과 일치)
const EMOJI_TICKERS = new Set([
  "US", "USA", "KR", "JP", "EU", "FOMC", "OPEC", "IRAN", "WORLDCUP", "CME", "MSCI",
]);

// 노출 대상 거래소 → CoinGecko exchange id (없으면 favicon 도메인으로 폴백)
const EXCHANGES = [
  { name: "Binance", cgId: "binance" },
  { name: "Upbit", cgId: "upbit" },
  { name: "Bithumb", cgId: "bithumb" },
  { name: "Bybit", cgId: "bybit_spot" },
  { name: "Coinbase", cgId: "gdax" },
  { name: "OKX", cgId: "okex" },
  { name: "Robinhood", cgId: null, domain: "robinhood.com" },
];

// 주식 ticker → 회사 도메인 (CoinGecko에 없으므로 Google favicon 사용)
const STOCK_DOMAIN = {
  AAPL: "apple.com", AVGO: "broadcom.com", MU: "micron.com",
  NVDA: "nvidia.com", ORCL: "oracle.com", SPCX: "spacex.com",
  COIN: "coinbase.com", NKN: "nkn.org",
};

async function download(url, dest) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return false; // 빈/깨진 이미지 방지
    await writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

const faviconUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

async function main() {
  await mkdir(COINS_DIR, { recursive: true });
  await mkdir(EX_DIR, { recursive: true });

  const prisma = new PrismaClient();
  const events = await prisma.calendarEvent.findMany({ select: { ticker: true, groupMain: true } });
  await prisma.$disconnect();

  // 주식은 동일 심볼의 크립토 토큰과 충돌하므로(예: AAPL·MU 토큰) CoinGecko가 아닌
  // 회사 favicon으로만 받는다. 그룹으로 분리한다.
  const stockTickers = new Set(
    events.filter((e) => e.groupMain === "주식").map((e) => e.ticker.toUpperCase()),
  );
  const tickers = [...new Set(events.map((e) => e.ticker.toUpperCase()))].filter(
    (t) => !EMOJI_TICKERS.has(t),
  );
  const cryptoTickers = tickers.filter((t) => !stockTickers.has(t));
  console.log(`대상 ticker ${tickers.length}개 (크립토 ${cryptoTickers.length} · 주식 ${stockTickers.size})`);

  // ── 1) 코인 로고 — CoinGecko markets (symbols 일괄 조회, 주식 제외) ──
  const collectedCoins = new Set();
  const symbols = cryptoTickers.map((t) => t.toLowerCase()).join(",");
  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${symbols}` +
      `&order=market_cap_desc&per_page=250&page=1&sparkline=false`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const rows = res.ok ? await res.json() : [];
    const bySym = new Map();
    for (const r of Array.isArray(rows) ? rows : []) {
      const sym = r.symbol?.toUpperCase();
      if (sym && r.image && !bySym.has(sym)) bySym.set(sym, r.image); // 시총 1위 우선
    }
    for (const [sym, img] of bySym) {
      if (await download(img, path.join(COINS_DIR, `${sym}.png`))) {
        collectedCoins.add(sym);
        console.log(`  coin ✓ ${sym}`);
      }
    }
  } catch (e) {
    console.log("코인 수집 실패:", e.message);
  }

  // ── 2) 남은 ticker — 주식 favicon 폴백 ──
  for (const t of tickers) {
    if (collectedCoins.has(t)) continue;
    const domain = STOCK_DOMAIN[t];
    if (!domain) continue;
    if (await download(faviconUrl(domain), path.join(COINS_DIR, `${t}.png`))) {
      collectedCoins.add(t);
      console.log(`  stock ✓ ${t} (${domain})`);
    }
  }

  // ── 3) 거래소 로고 ──
  let exImages = {};
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/exchanges?per_page=250&page=1", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const arr = res.ok ? await res.json() : [];
    exImages = Object.fromEntries(arr.map((e) => [e.id, e.image]));
  } catch { /* 폴백 favicon 사용 */ }

  const collectedExchanges = [];
  for (const ex of EXCHANGES) {
    const cgImg = ex.cgId ? exImages[ex.cgId] : null;
    const url = cgImg || faviconUrl(ex.domain ?? `${ex.name.toLowerCase()}.com`);
    if (await download(url, path.join(EX_DIR, `${ex.name}.png`))) {
      collectedExchanges.push(ex.name);
      console.log(`  exchange ✓ ${ex.name}`);
    }
  }

  // ── 4) 매니페스트 생성 ──
  const coinsSorted = [...collectedCoins].sort();
  const manifest =
    `// 자동 생성됨 — scripts/collect-logos.mjs. 직접 수정하지 말 것.\n` +
    `// 로컬 로고가 있는 ticker/거래소 집합. EventIcon·ListingsStrip이 참조한다.\n\n` +
    `export const COIN_LOGOS = new Set<string>(${JSON.stringify(coinsSorted)});\n\n` +
    `export const EXCHANGE_LOGOS = new Set<string>(${JSON.stringify(collectedExchanges)});\n`;
  await writeFile(path.join(ROOT, "lib/logos.ts"), manifest);

  console.log(`\n완료 — 코인 ${coinsSorted.length} · 거래소 ${collectedExchanges.length}`);
  console.log("코인:", coinsSorted.join(", "));
  const missing = tickers.filter((t) => !collectedCoins.has(t));
  if (missing.length) console.log("미수집(이니셜 뱃지로 폴백):", missing.join(", "));
}

main();
