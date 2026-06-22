import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/visits";

export const dynamic = "force-dynamic";

// 접속 1회 기록 — 클라이언트가 세션당 1회 호출
export async function POST() {
  try {
    await recordVisit();
  } catch {
    // 집계 실패는 사용자 경험에 영향 없도록 조용히 무시
  }
  return NextResponse.json({ ok: true });
}
