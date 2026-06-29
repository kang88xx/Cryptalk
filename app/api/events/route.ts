import { NextResponse } from "next/server";
import { getMonthEvents } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10); // 1-12

  if (!year || year < 2000 || year > 2100 || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "올바른 year(2000~2100)/month(1~12)가 필요합니다." }, { status: 400 });
  }

  // UTC 기준 월 경계 — 캘린더/홈이 이벤트를 통상(UTC) 날짜로 나열하므로 일치시킨다 (lib/calendar)
  const events = await getMonthEvents(year, month);
  return NextResponse.json({ events });
}
