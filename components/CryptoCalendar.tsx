"use client";

import { useEffect, useMemo, useState } from "react";
import EventIcon from "@/components/EventIcon";

type CalendarEvent = {
  id: number;
  date: string;
  isTba: boolean;
  ticker: string;
  title: string;
  description: string;
  category: string;
  groupMain: string;
  groupSub: string;
  sourceUrl: string | null;
};

// 필터 탭 기본 분류 체계 (이벤트 데이터에 새 분류가 있으면 자동 추가됨)
const TAXONOMY: Record<string, string[]> = {
  크립토: ["언락", "TGE·상장", "상폐·리스크", "거래소", "파트너십", "프로젝트", "컨퍼런스"],
  주식: ["실적·발표", "IPO", "컨퍼런스", "지수"],
  매크로: ["경제지표", "금리결정", "정치·정책", "지정학"],
  이벤트: ["스포츠"],
};

const filterKey = (group: string, sub: string) => `${group}|${sub}`;

const CATEGORY_LABEL: Record<string, string> = {
  important: "중요",
  good: "호재",
  bad: "악재",
  neutral: "중립",
};

const BADGE_STYLE: Record<string, string> = {
  important: "bg-indigo-500/15 text-indigo-700",
  good: "bg-emerald-500/15 text-emerald-700",
  bad: "bg-red-500/15 text-red-700",
  neutral: "bg-paper2 text-ink-500",
};

// 그룹별 색상 — 필터 pill과 달력 이벤트 칩에 동일하게 적용되어 색 자체가 범례가 됨
type GroupStyle = { solid: string; text: string; dot: string; chip: string };
const GROUP_COLORS: Record<string, GroupStyle> = {
  크립토: {
    solid: "bg-indigo-500 text-white",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    chip: "border-indigo-500/40 bg-indigo-500/10 text-indigo-700",
  },
  주식: {
    solid: "bg-emerald-500 text-white",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  },
  매크로: {
    solid: "bg-amber-500 text-navy-950",
    text: "text-amber-700",
    dot: "bg-amber-500",
    chip: "border-amber-500/50 bg-amber-300/30 text-amber-700",
  },
  이벤트: {
    solid: "bg-rose-500 text-white",
    text: "text-rose-700",
    dot: "bg-rose-500",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-700",
  },
};
const GROUP_FALLBACK: GroupStyle = {
  solid: "bg-navy-700 text-white",
  text: "text-navy-700",
  dot: "bg-navy-500",
  chip: "border-navy-300/50 bg-paper2 text-navy-700",
};
const groupColor = (g: string): GroupStyle => GROUP_COLORS[g] ?? GROUP_FALLBACK;

const KST_OFFSET = 9 * 3600_000;
const IMMINENT_MS = 12 * 3600_000; // 시작 12시간 전부터 강조

// 확정 시각이 있는 이벤트만 Date 반환 (00:00 UTC = 시각 미지정 → null)
function eventTime(ev: CalendarEvent): Date | null {
  if (ev.isTba) return null;
  const d = new Date(ev.date);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null;
  return d;
}

// KST HH:mm
function kstHm(d: Date): string {
  const k = new Date(d.getTime() + KST_OFFSET);
  return `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function CryptoCalendar({
  initialYear,
  initialMonth,
}: {
  initialYear: number;
  initialMonth: number; // 1-12
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const monthKey = `${year}-${month}`;
  const loading = loadedKey !== monthKey;
  const [excluded, setExcluded] = useState<Set<string>>(new Set()); // 체크 해제된 소분류
  const [now, setNow] = useState(0); // 임박 판정용 — 마운트 후 설정(하이드레이션 안전)

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [g, subs] of Object.entries(TAXONOMY)) map.set(g, [...subs]);
    for (const ev of events) {
      if (!map.has(ev.groupMain)) map.set(ev.groupMain, []);
      const list = map.get(ev.groupMain)!;
      if (!list.includes(ev.groupSub)) list.push(ev.groupSub);
    }
    return map;
  }, [events]);

  const isGroupOn = (g: string) =>
    (groups.get(g) ?? []).some((s) => !excluded.has(filterKey(g, s)));

  const toggleGroup = (g: string) => {
    const subs = groups.get(g) ?? [];
    const turnOff = isGroupOn(g);
    setExcluded((prev) => {
      const next = new Set(prev);
      subs.forEach((s) => (turnOff ? next.add(filterKey(g, s)) : next.delete(filterKey(g, s))));
      return next;
    });
  };

  const toggleSub = (g: string, s: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      const k = filterKey(g, s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const visibleEvents = events.filter(
    (ev) => !excluded.has(filterKey(ev.groupMain, ev.groupSub))
  );

  useEffect(() => {
    let alive = true;
    const key = `${year}-${month}`;
    fetch(`/api/events?year=${year}&month=${month}`)
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => {
        if (alive) {
          setEvents(data.events ?? []);
          setLoadedKey(key);
        }
      })
      .catch(() => {
        if (alive) {
          setEvents([]);
          setLoadedKey(key);
        }
      });
    return () => {
      alive = false;
    };
  }, [year, month]);

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 월요일 시작

  // 이벤트는 KST 날짜로 배치 — 홈 위젯·시각 라벨(KST)과 일치시켜 자정 근처 이벤트
  // 가 홈/캘린더에서 다른 날에 표시되는 문제를 방지한다.
  const byDay = new Map<number, CalendarEvent[]>();
  const tbaEvents: CalendarEvent[] = [];
  for (const ev of visibleEvents) {
    if (ev.isTba) {
      tbaEvents.push(ev);
      continue;
    }
    const day = new Date(new Date(ev.date).getTime() + KST_OFFSET).getUTCDate();
    const list = byDay.get(day) ?? [];
    list.push(ev);
    byDay.set(day, list);
  }

  // 오늘 강조도 KST 기준 — 마운트 후 설정되는 now 상태 사용(하이드레이션 안전 + 렌더 순수성)
  const nowKst = now > 0 ? new Date(now + KST_OFFSET) : null;
  const isThisMonth =
    !!nowKst && nowKst.getUTCFullYear() === year && nowKst.getUTCMonth() + 1 === month;
  const todayDay = nowKst ? nowKst.getUTCDate() : -1;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-base font-semibold tracking-tight text-navy-900">크립토 캘린더</h2>
          <span className="eyebrow hidden sm:inline">Crypto Calendar</span>
        </div>
        <div className="flex shrink-0 items-center border border-line bg-white text-sm">
          <button
            onClick={() => moveMonth(-1)}
            className="px-3 py-1.5 text-ink-500 hover:bg-paper2 hover:text-navy-900"
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="w-24 border-x border-line py-1.5 text-center font-semibold text-navy-900 tabular-nums">
            {year}년 {month}월
          </span>
          <button
            onClick={() => moveMonth(1)}
            className="px-3 py-1.5 text-ink-500 hover:bg-paper2 hover:text-navy-900"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </header>

      {/* 툴바 — 그룹 필터(eyebrow 타입: 배경 없이 색점 + 대문자 레터스페이싱 텍스트) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-line px-4 py-2.5">
        <button
          onClick={() => setExcluded(new Set())}
          className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
            excluded.size === 0
              ? "text-navy-900"
              : "text-navy-300 hover:text-ink-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 ${excluded.size === 0 ? "bg-navy-900" : "bg-navy-300"}`} />
          전체
        </button>
        {[...groups.keys()].map((g) => {
          const on = isGroupOn(g);
          const c = groupColor(g);
          const count = events.filter((e) => e.groupMain === g).length;
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                on ? c.text : "text-navy-300 hover:text-ink-500"
              }`}
            >
              <span className={`h-1.5 w-1.5 ${on ? c.dot : "bg-navy-300"}`} />
              {g}
              <span className="tabular-nums tracking-normal opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 소분류 필터 — 보조 위계, 활성 그룹만 노출 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2">
        {[...groups.entries()]
          .filter(([g]) => isGroupOn(g))
          .map(([g, subs]) => {
            const c = groupColor(g);
            return (
              <span key={g} className="flex flex-wrap items-center gap-1.5">
                <span className={`font-mono text-[10px] tracking-wider uppercase ${c.text}`}>{g}</span>
                {subs.map((s) => {
                  const off = excluded.has(filterKey(g, s));
                  return (
                    <button
                      key={filterKey(g, s)}
                      onClick={() => toggleSub(g, s)}
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        off
                          ? "border-transparent bg-paper2 text-navy-300 line-through hover:text-ink-500"
                          : c.chip
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </span>
            );
          })}
      </div>

      <div className="grid grid-cols-7 border-b border-line bg-paper2 text-center text-[11px] text-navy-500">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`py-1.5 font-medium ${i === 5 ? "text-indigo-700/80" : ""} ${i === 6 ? "text-red-600/80" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-ink-500">캘린더 불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day != null && isThisMonth && day === todayDay;
            return (
            <div
              key={i}
              className={`relative min-h-16 border-b border-r border-line p-1 sm:min-h-20 [&:nth-child(7n)]:border-r-0 ${
                day == null ? "bg-paper" : ""
              } ${isToday ? "z-10 ring-2 ring-inset ring-red-500" : ""}`}
            >
              {day != null && (
                <>
                  <div className="mb-1 text-right font-mono text-[11px]">
                    {isToday ? (
                      <span className="inline-block bg-red-500 px-1 font-semibold text-white">
                        {day}
                      </span>
                    ) : (
                      <span className="text-navy-300">{day}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(byDay.get(day) ?? []).map((ev) => {
                      const t = eventTime(ev);
                      const imminent =
                        t != null && now > 0 && t.getTime() - now >= 0 && t.getTime() - now <= IMMINENT_MS;
                      return (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        className={`flex items-center gap-1 border px-1 py-0.5 text-left text-[10px] leading-tight hover:brightness-95 ${
                          groupColor(ev.groupMain).chip
                        } ${imminent ? "event-imminent" : ""}`}
                        title={`${ev.ticker} ${ev.title}${t ? ` · ${kstHm(t)} KST` : ""}`}
                      >
                        <EventIcon ticker={ev.ticker} size={13} />
                        <span className="min-w-0 flex-1 truncate">
                          <b>{ev.ticker}</b>{" "}
                          {t && <span className="font-mono font-semibold">{kstHm(t)}</span>}{" "}
                          {ev.title}
                        </span>
                      </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            );
          })}
        </div>
      )}

      {tbaEvents.length > 0 && (
        <div className="border-t border-line px-4 py-2.5">
          <p className="eyebrow mb-1.5">TBA — {month}월 중 일정 미정</p>
          <div className="flex flex-wrap gap-1">
            {tbaEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelected(ev)}
                className={`flex items-center gap-1 border px-1.5 py-0.5 text-[10px] hover:brightness-95 ${
                  groupColor(ev.groupMain).chip
                }`}
              >
                <EventIcon ticker={ev.ticker} size={13} />
                <span>
                  <b>{ev.ticker}</b> {ev.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center border-t border-line px-4 py-2">
        <span className="rail">
          Showing {visibleEvents.length} / {events.length} events
        </span>
        <span className="ml-auto text-[10px] text-navy-300">
          이벤트를 누르면 개별 출처를 확인할 수 있습니다
        </span>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md border border-line bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`px-1.5 py-0.5 text-[11px] font-bold ${BADGE_STYLE[selected.category] ?? BADGE_STYLE.neutral}`}>
                {CATEGORY_LABEL[selected.category] ?? "중립"}
              </span>
              <span className="bg-paper2 px-1.5 py-0.5 text-[11px] text-navy-500">
                {selected.groupMain} · {selected.groupSub}
              </span>
              <span className="font-mono text-xs text-ink-500">
                {selected.isTba
                  ? `${month}월 중 (TBA)`
                  : (() => {
                      const t = eventTime(selected);
                      const ko = new Date(selected.date).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "Asia/Seoul",
                      });
                      return t ? `${ko} · ${kstHm(t)} KST` : ko;
                    })()}
              </span>
            </div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
              <EventIcon ticker={selected.ticker} size={20} />
              <span>
                {selected.ticker}{" "}
                <span className="font-medium text-ink-900">{selected.title}</span>
              </span>
            </h3>
            <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-ink-900">
              {selected.description}
            </p>
            <div className="mt-5 flex items-center justify-between">
              {selected.sourceUrl ? (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-navy-700 underline-offset-2 hover:underline"
                >
                  출처 보기 ↗
                </a>
              ) : (
                <span />
              )}
              <button
                onClick={() => setSelected(null)}
                className="border border-navy-300 px-3 py-1 text-sm text-ink-500 hover:border-navy-900 hover:text-navy-900"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
