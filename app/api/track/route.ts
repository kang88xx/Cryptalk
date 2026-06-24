import { NextResponse } from "next/server";
import { recordVisit, kstDay } from "@/lib/visits";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// 접속 기록 — IP당 하루 1회만 집계(고유 IP/일 기준)해서 curl 루프 등 무제한 부풀리기를 막는다.
export async function POST(req: Request) {
  try {
    const first = await checkRateLimit(`visit:${kstDay()}:${clientIp(req)}`, 1, 24 * 3600_000);
    if (first) await recordVisit();
  } catch {
    // 집계 실패는 사용자 경험에 영향 없도록 조용히 무시
  }
  return NextResponse.json({ ok: true });
}
