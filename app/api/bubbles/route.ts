import { NextResponse } from "next/server";
import { getBubbles } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getBubbles();
  return NextResponse.json(snapshot, {
    headers: {
      // CDN/브라우저 공유 캐시 — 폴링 부하 완화 (시총 랭킹은 분 단위 갱신)
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
