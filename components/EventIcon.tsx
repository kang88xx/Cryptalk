"use client";

import { useState } from "react";
import { COIN_LOGOS } from "@/lib/logos";

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

// 코인/종목 아이콘: 이모지 → 수집한 로컬 로고(public/logos/coins) → 이니셜 뱃지 순서로 폴백
export default function EventIcon({ ticker, size = 13 }: { ticker: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const T = ticker.toUpperCase();
  const emoji = EMOJI_ICON[T];

  if (emoji) {
    return (
      <span className="shrink-0 leading-none" style={{ fontSize: size }}>
        {emoji}
      </span>
    );
  }
  if (COIN_LOGOS.has(T) && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/logos/coins/${T}.png`}
        width={size}
        height={size}
        alt=""
        className="shrink-0 rounded-full object-contain"
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
