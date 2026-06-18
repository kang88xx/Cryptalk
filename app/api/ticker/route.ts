import { NextResponse } from "next/server";
import { getTickers } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getTickers();
  return NextResponse.json(snapshot, {
    headers: {
      // CDN/브라우저 공유 캐시 — 폴링 부하 완화
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}
