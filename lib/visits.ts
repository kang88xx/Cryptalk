import { prisma } from "@/lib/prisma";

// KST(UTC+9) 기준 날짜 문자열 "YYYY-MM-DD"
export function kstDay(d: Date = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 오늘(KST) 접속자 +1 — day 행이 없으면 생성
export async function recordVisit(): Promise<void> {
  const day = kstDay();
  await prisma.visitStat.upsert({
    where: { day },
    create: { day, count: 1 },
    update: { count: { increment: 1 } },
  });
}

// 금일 총 접속자
export async function todayVisits(): Promise<number> {
  const row = await prisma.visitStat.findUnique({ where: { day: kstDay() } });
  return row?.count ?? 0;
}

// 최근 N일 집계 (최신순)
export async function recentVisits(days = 7) {
  return prisma.visitStat.findMany({
    orderBy: { day: "desc" },
    take: days,
  });
}
