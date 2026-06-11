"use client";

import { useEffect, useMemo, useState } from "react";

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

const CATEGORY_GUIDE: Record<string, string> = {
  important: "시장 주요 일정 (지표·금리·실적)",
  good: "긍정적 이벤트 (출시·파트너십)",
  bad: "부정적 이벤트 (언락·상폐·리스크)",
  neutral: "영향 제한적",
};

const CHIP_STYLE: Record<string, string> = {
  important: "border-indigo-500/40 bg-indigo-500/10 text-indigo-700",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  bad: "border-red-500/40 bg-red-500/10 text-red-700",
  neutral: "border-navy-300/50 bg-paper2 text-ink-500",
};

const BADGE_STYLE: Record<string, string> = {
  important: "bg-indigo-500/15 text-indigo-700",
  good: "bg-emerald-500/15 text-emerald-700",
  bad: "bg-red-500/15 text-red-700",
  neutral: "bg-paper2 text-ink-500",
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

// 국가/거시/특수 이벤트용 이모지 아이콘
const EMOJI_ICON: Record<string, string> = {
  US: "🇺🇸",
  USA: "🇺🇸",
  KR: "🇰🇷",
  JP: "🇯🇵",
  EU: "🇪🇺",
  FOMC: "🏛️",
  OPEC: "🛢️",
  IRAN: "⚠️",
  WORLDCUP: "⚽",
  CME: "📈",
  MSCI: "📊",
};

const BADGE_COLORS = [
  "bg-indigo-500/20 text-indigo-700",
  "bg-emerald-500/20 text-emerald-700",
  "bg-navy-900/10 text-navy-700",
  "bg-rose-500/20 text-rose-700",
  "bg-amber-300 text-navy-900",
  "bg-orange-500/20 text-orange-700",
];

function badgeColor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

// 코인 아이콘: 이모지 → CoinCap CDN 이미지 → 이니셜 뱃지 순서로 폴백
function EventIcon({ ticker, size = 13 }: { ticker: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const emoji = EMOJI_ICON[ticker.toUpperCase()];

  if (emoji) {
    return (
      <span className="shrink-0 leading-none" style={{ fontSize: size }}>
        {emoji}
      </span>
    );
  }
  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://assets.coincap.io/assets/icons/${ticker.toLowerCase()}@2x.png`}
        width={size}
        height={size}
        alt=""
        className="shrink-0 rounded-full"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${badgeColor(ticker)}`}
      style={{ width: size, height: size, fontSize: Math.max(7, size * 0.55) }}
    >
      {ticker.slice(0, 1)}
    </span>
  );
}

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

  const byDay = new Map<number, CalendarEvent[]>();
  const tbaEvents: CalendarEvent[] = [];
  for (const ev of visibleEvents) {
    if (ev.isTba) {
      tbaEvents.push(ev);
      continue;
    }
    const day = new Date(ev.date).getUTCDate();
    const list = byDay.get(day) ?? [];
    list.push(ev);
    byDay.set(day, list);
  }

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="eyebrow">Crypto Calendar</p>
          <h2 className="text-sm font-semibold text-navy-900">
            크립토 캘린더 <span className="font-normal text-ink-500">— 이벤트를 누르면 상세를 볼 수 있습니다</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => moveMonth(-1)}
            className="px-2 py-0.5 text-ink-500 hover:bg-paper2 hover:text-navy-900"
            aria-label="이전 달"
          >
            ◀
          </button>
          <span className="w-24 text-center font-semibold text-navy-900">
            {year}년 {month}월
          </span>
          <button
            onClick={() => moveMonth(1)}
            className="px-2 py-0.5 text-ink-500 hover:bg-paper2 hover:text-navy-900"
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>
      </header>

      {/* 색상 가이드 — 이벤트 색은 시장 영향 분류 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-paper px-4 py-2 text-[11px] text-ink-500">
        <span className="eyebrow">Color Guide</span>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 border ${CHIP_STYLE[key]}`} />
            <b className="text-ink-900">{label}</b> {CATEGORY_GUIDE[key]}
          </span>
        ))}
      </div>

      {/* 분류 필터 — 원하는 분류만 체크해서 보기 */}
      <div className="border-b border-line px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setExcluded(new Set())}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              excluded.size === 0
                ? "bg-navy-900 text-white"
                : "border border-navy-300 text-ink-500 hover:border-navy-900 hover:text-navy-900"
            }`}
          >
            전체
          </button>
          {[...groups.keys()].map((g) => {
            const on = isGroupOn(g);
            const count = events.filter((e) => e.groupMain === g).length;
            return (
              <button
                key={g}
                onClick={() => toggleGroup(g)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  on
                    ? "bg-navy-900 text-white"
                    : "border border-line text-navy-300 hover:border-navy-300 hover:text-ink-500"
                }`}
              >
                {g} <span className={on ? "font-mono text-navy-300" : "font-mono text-navy-300/70"}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {[...groups.entries()]
            .filter(([g]) => isGroupOn(g))
            .map(([g, subs]) => (
              <span key={g} className="flex flex-wrap items-center gap-1">
                <span className="font-mono text-[10px] tracking-wider text-navy-300 uppercase">{g}</span>
                {subs.map((s) => {
                  const off = excluded.has(filterKey(g, s));
                  return (
                    <button
                      key={filterKey(g, s)}
                      onClick={() => toggleSub(g, s)}
                      className={`border px-1.5 py-0.5 text-[10px] ${
                        off
                          ? "border-line text-navy-300 line-through"
                          : "border-amber-500/60 bg-amber-300/40 text-navy-900"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </span>
            ))}
        </div>
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
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-20 border-b border-r border-line p-1 [&:nth-child(7n)]:border-r-0 ${
                day == null ? "bg-paper" : ""
              }`}
            >
              {day != null && (
                <>
                  <div className="mb-1 text-right font-mono text-[11px]">
                    {isThisMonth && day === today.getDate() ? (
                      <span className="inline-block bg-amber-500 px-1 font-semibold text-navy-950">
                        {day}
                      </span>
                    ) : (
                      <span className="text-navy-300">{day}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(byDay.get(day) ?? []).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        className={`flex items-center gap-1 border px-1 py-0.5 text-left text-[10px] leading-tight hover:brightness-95 ${
                          CHIP_STYLE[ev.category] ?? CHIP_STYLE.neutral
                        }`}
                        title={`${ev.ticker} ${ev.title}`}
                      >
                        <EventIcon ticker={ev.ticker} size={13} />
                        <span className="min-w-0 flex-1 truncate">
                          <b>{ev.ticker}</b> {ev.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
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
                  CHIP_STYLE[ev.category] ?? CHIP_STYLE.neutral
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
                  : new Date(selected.date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
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
