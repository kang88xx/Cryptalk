import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { upcomingUtcRange, kstTimeLabel } from "@/lib/time";
import EventIcon from "@/components/EventIcon";

const WD = ["일", "월", "화", "수", "목", "금", "토"];

const CAT_DOT: Record<string, string> = {
  important: "bg-indigo-500",
  good: "bg-emerald-500",
  bad: "bg-red-500",
  neutral: "bg-navy-300",
};
const CAT_LABEL: Record<string, string> = {
  important: "중요",
  good: "호재",
  bad: "악재",
  neutral: "중립",
};

// 홈용 "다가오는 일정" — 오늘부터 7일. 통상(UTC) 날짜로 묶고, 한국시간은 보조 표기.
export default async function UpcomingEvents() {
  const { now, startUtc, endUtc } = upcomingUtcRange(7);

  const events = await prisma.calendarEvent.findMany({
    where: { date: { gte: startUtc, lt: endUtc }, isTba: false },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    take: 24,
  });

  // UTC 일자별 그룹 (오늘/내일 라벨도 UTC 기준)
  const d = new Date(now);
  const todayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const tmr = new Date(now + 86400_000);
  const tmrKey = `${tmr.getUTCFullYear()}-${tmr.getUTCMonth()}-${tmr.getUTCDate()}`;

  const groups = new Map<string, { label: string; sub: string; items: typeof events }>();
  for (const ev of events) {
    const k = ev.date;
    const key = `${k.getUTCFullYear()}-${k.getUTCMonth()}-${k.getUTCDate()}`;
    const sub = `${k.getUTCMonth() + 1}.${k.getUTCDate()} (${WD[k.getUTCDay()]})`;
    const label = key === todayKey ? "오늘" : key === tmrKey ? "내일" : sub;
    if (!groups.has(key)) groups.set(key, { label, sub: label === sub ? "" : sub, items: [] });
    groups.get(key)!.items.push(ev);
  }

  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-navy-900">다가오는 일정</h2>
          <span className="eyebrow hidden sm:inline">Upcoming · 7d</span>
        </div>
        <Link href="/calendar" className="text-xs text-ink-500 hover:text-navy-900">
          전체 캘린더 +
        </Link>
      </header>

      {groups.size === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-500">
          다가오는 7일 내 등록된 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {[...groups.values()].map((g, gi) => (
            <li key={gi} className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:gap-3">
              <div className="flex shrink-0 items-baseline gap-1.5 sm:w-20 sm:flex-col sm:gap-0">
                <span
                  className={`text-xs font-semibold ${
                    g.label === "오늘" ? "text-red-600" : "text-navy-900"
                  }`}
                >
                  {g.label}
                </span>
                {g.sub && <span className="text-[10px] text-navy-300">{g.sub}</span>}
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {g.items.map((ev) => {
                  const { time, nextDay } = kstTimeLabel(ev.date);
                  return (
                    <li key={ev.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          CAT_DOT[ev.category] ?? CAT_DOT.neutral
                        }`}
                        title={CAT_LABEL[ev.category] ?? "중립"}
                      />
                      <EventIcon ticker={ev.ticker} size={15} />
                      {time && (
                        <span className="shrink-0 font-mono text-xs font-semibold text-navy-700">
                          {time}
                          {nextDay && <span className="ml-0.5 text-[9px] text-navy-300">익일</span>}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-ink-900">
                        <b className="text-navy-900">{ev.ticker}</b> {ev.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-line px-4 py-2">
        <span className="rail">날짜 통상(UTC) 기준 · 시각은 KST(익일=한국시간 다음날 새벽)</span>
      </p>
    </section>
  );
}
