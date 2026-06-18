import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10); // 1-12

  if (!year || year < 2000 || year > 2100 || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "올바른 year(2000~2100)/month(1~12)가 필요합니다." }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const events = await prisma.calendarEvent.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ events });
}
