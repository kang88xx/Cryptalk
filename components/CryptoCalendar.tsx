"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  id: number;
  date: string;
  isTba: boolean;
  ticker: string;
  title: string;
  description: string;
  category: string;
  sourceUrl: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  important: "중요",
  good: "호재",
  bad: "악재",
  neutral: "중립",
};

const CHIP_STYLE: Record<string, string> = {
  important: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  good: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  bad: "bg-red-500/15 text-red-300 border-red-500/30",
  neutral: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const BADGE_STYLE: Record<string, string> = {
  important: "bg-blue-500/20 text-blue-300",
  good: "bg-emerald-500/20 text-emerald-300",
  bad: "bg-red-500/20 text-red-300",
  neutral: "bg-zinc-500/20 text-zinc-300",
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
  "bg-blue-500/30 text-blue-200",
  "bg-emerald-500/30 text-emerald-200",
  "bg-violet-500/30 text-violet-200",
  "bg-rose-500/30 text-rose-200",
  "bg-cyan-500/30 text-cyan-200",
  "bg-orange-500/30 text-orange-200",
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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/events?year=${year}&month=${month}`)
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data) => {
        if (alive) setEvents(data.events ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
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
  for (const ev of events) {
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
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <h2 className="text-sm font-bold text-zinc-100">
          크립토 캘린더 <span className="text-zinc-500">— 이벤트를 누르면 상세를 볼 수 있습니다</span>
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => moveMonth(-1)}
            className="rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800"
            aria-label="이전 달"
          >
            ◀
          </button>
          <span className="w-24 text-center font-semibold text-zinc-200">
            {year}년 {month}월
          </span>
          <button
            onClick={() => moveMonth(1)}
            className="rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800"
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-[11px] text-zinc-500">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-1.5 font-medium ${i === 5 ? "text-blue-400/70" : ""} ${i === 6 ? "text-red-400/70" : ""}`}>
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-500">캘린더 불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`min-h-20 border-b border-r border-zinc-800/50 p-1 [&:nth-child(7n)]:border-r-0 ${
                day == null ? "bg-zinc-950/40" : ""
              }`}
            >
              {day != null && (
                <>
                  <div
                    className={`mb-1 text-right text-[11px] ${
                      isThisMonth && day === today.getDate()
                        ? "font-bold text-amber-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {(byDay.get(day) ?? []).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        className={`flex items-center gap-1 rounded border px-1 py-0.5 text-left text-[10px] leading-tight hover:brightness-125 ${
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
        <div className="border-t border-zinc-800 px-4 py-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-zinc-400">TBA — {month}월 중 일정 미정</p>
          <div className="flex flex-wrap gap-1">
            {tbaEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelected(ev)}
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] hover:brightness-125 ${
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

      <div className="flex items-center gap-3 border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-500">
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-sm ${BADGE_STYLE[key]}`} />
            {label}
          </span>
        ))}
        <span className="ml-auto">출처: LAYER.GG</span>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${BADGE_STYLE[selected.category] ?? BADGE_STYLE.neutral}`}>
                {CATEGORY_LABEL[selected.category] ?? "중립"}
              </span>
              <span className="text-xs text-zinc-500">
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
            <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-50">
              <EventIcon ticker={selected.ticker} size={20} />
              <span>
                {selected.ticker}{" "}
                <span className="font-semibold text-zinc-300">{selected.title}</span>
              </span>
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{selected.description}</p>
            <div className="mt-5 flex items-center justify-between">
              {selected.sourceUrl ? (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:underline"
                >
                  출처 보기 (LAYER.GG) ↗
                </a>
              ) : (
                <span />
              )}
              <button
                onClick={() => setSelected(null)}
                className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
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
