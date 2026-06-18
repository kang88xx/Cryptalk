import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 매크로 이벤트 확정 발표 시각(UTC). 6월=美 동부서머타임(EDT, UTC-4).
//  - 미 노동/상무부 지표: 08:30 ET → 12:30 UTC
//  - JOLTS: 10:00 ET → 14:00 UTC
//  - FOMC 성명: 14:00 ET → 18:00 UTC
// titleMatch 로 식별, 해당 날짜에 시각만 부여. 시각이 불확실한 이벤트(BoJ·정치·지정학)는 제외.
const TIMES: { match: string; utcHour: number; utcMin: number }[] = [
  { match: "CPI", utcHour: 12, utcMin: 30 },
  { match: "PPI", utcHour: 12, utcMin: 30 },
  { match: "PCE", utcHour: 12, utcMin: 30 },
  { match: "JOLTS", utcHour: 14, utcMin: 0 },
  { match: "Interest Rates", utcHour: 18, utcMin: 0 }, // FOMC
];

async function main() {
  const macro = await prisma.calendarEvent.findMany({ where: { groupMain: "매크로" } });
  let updated = 0;
  for (const ev of macro) {
    const rule = TIMES.find((t) => ev.title.includes(t.match));
    if (!rule || ev.isTba) continue;
    const d = new Date(ev.date);
    const withTime = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), rule.utcHour, rule.utcMin)
    );
    await prisma.calendarEvent.update({ where: { id: ev.id }, data: { date: withTime } });
    console.log(`✓ ${ev.ticker} ${ev.title} → ${withTime.toISOString()}`);
    updated++;
  }
  console.log(`\n${updated}건 시각 반영 완료.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
