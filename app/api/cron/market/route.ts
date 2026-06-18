import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTickers,
  getExchangeComparison,
  getKrwMarketStats,
  getKimchiTable,
  getSignalRadar,
  getExchangeSpread,
  getTrendLabels,
} from "@/lib/ticker";
import { getMarketOverview, getFxHistory } from "@/lib/market";
import { getTodayListings } from "@/lib/listings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KIMP_INTERVAL_MS = 5 * 60_000;
const MARKET_INTERVAL_MS = 15 * 60_000;

// Vercel Cron이 주기적으로 호출. getter는 TTL을 존중하므로(만료된 키만 실제 갱신)
// 크론 주기와 무관하게 과갱신 없이 캐시를 따뜻하게 유지한다. 스냅샷은 요청 경로에서
// 분리해 방문수와 무관하게 일정 주기로만 적재한다.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : false;
  // 프로덕션에서는 CRON_SECRET 인증 필수(미설정/불일치 시 차단). 개발에서는 허용.
  if (!authed && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // TTL 만료된 캐시만 갱신 (느린 데이터는 자기 주기대로만 외부 호출)
  const warm = await Promise.allSettled([
    getTickers(),
    getExchangeComparison(),
    getKrwMarketStats(),
    getKimchiTable(),
    getSignalRadar(),
    getExchangeSpread(),
    getTrendLabels(),
    getMarketOverview(),
    getFxHistory(),
    getTodayListings(),
  ]);
  const warmFailed = warm.filter((r) => r.status === "rejected").length;

  const result: Record<string, unknown> = { warmFailed };

  // 김프 스냅샷 — 마지막 기록이 5분 이상 지났을 때만
  try {
    const last = await prisma.kimpSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
    if (!last || Date.now() - last.createdAt.getTime() >= KIMP_INTERVAL_MS) {
      const snap = await getTickers();
      const btc = snap.tickers.find((t) => t.symbol === "BTC");
      if (btc?.kimchiPremium != null && btc.priceKrw != null && btc.priceUsd != null) {
        await prisma.kimpSnapshot.create({
          data: { btcKrw: btc.priceKrw, btcUsd: btc.priceUsd, usdKrw: snap.usdKrw, kimp: btc.kimchiPremium },
        });
        result.kimpSnapshot = "written";
      }
    }
  } catch {
    result.kimpSnapshot = "error";
  }

  // 시장(도미넌스) 스냅샷 — 마지막 기록이 15분 이상 지났을 때만
  try {
    const last = await prisma.marketSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
    if (!last || Date.now() - last.createdAt.getTime() >= MARKET_INTERVAL_MS) {
      const ov = await getMarketOverview();
      if (ov.btcDominance != null && ov.totalMarketCapUsd != null) {
        await prisma.marketSnapshot.create({
          data: { btcDominance: ov.btcDominance, totalMcapUsd: ov.totalMarketCapUsd },
        });
        result.marketSnapshot = "written";
      }
    }
  } catch {
    result.marketSnapshot = "error";
  }

  // 만료된 레이트리밋 행 정리 (1시간 지난 것)
  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 3600_000) } } });
  } catch {
    // 정리 실패는 무시
  }

  // 워밍 일부 실패 시 200이 아닌 상태로 알려 크론 헬스에 반영
  return NextResponse.json({ ok: warmFailed === 0, ...result }, { status: warmFailed === 0 ? 200 : 207 });
}
