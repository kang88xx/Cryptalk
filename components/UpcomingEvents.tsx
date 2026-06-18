import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { upcomingKstRange } from "@/lib/time";
import EventIcon from "@/components/EventIcon";

const KST = 9 * 3600_000;
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

// 시각 미지정(00:00 UTC) 또는 TBA면 시간 라벨 없음
function kstTime(date: Date, isTba: boolean): string | null {
  if (isTba) return null;
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) return null;
  const k = new Date(date.getTime() + KST);
  return `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}

// 홈용 "다가오는 일정" — 오늘부터 7일, KST 기준 일자별 묶음
export default async function UpcomingEvents() {
  const { now, startUtc, endUtc } = upcomingKstRange(7); // 오늘 포함 7일

  const events = await prisma.calendarEvent.findMany({
    where: { date: { gte: startUtc, lt: endUtc }, isTba: false },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    take: 24,
  });

  // KST 일자별 그룹
  const kn = new Date(now + KST);
  const todayKey = `${kn.getUTCFullYear()}-${kn.getUTCMonth()}-${kn.getUTCDate()}`;
  const tmr = new Date(now + KST + 86400_000);
  const tmrKey = `${tmr.getUTCFullYear()}-${tmr.getUTCMonth()}-${tmr.getUTCDate()}`;

  const groups = new Map<string, { label: string; sub: string; items: typeof events }>();
  for (const ev of events) {
    const k = new Date(ev.date.getTime() + KST);
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
                  const t = kstTime(ev.date, ev.isTba);
                  return (
                    <li key={ev.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          CAT_DOT[ev.category] ?? CAT_DOT.neutral
                        }`}
                        title={CAT_LABEL[ev.category] ?? "중립"}
                      />
                      <EventIcon ticker={ev.ticker} size={15} />
                      {t && (
                        <span className="shrink-0 font-mono text-xs font-semibold text-navy-700">
                          {t}
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
        <span className="rail">KST 기준 · 시각 미정 일정은 전체 캘린더에서 확인</span>
      </p>
    </section>
  );
}
