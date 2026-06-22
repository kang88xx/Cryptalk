"use client";

import { useEffect, useState } from "react";

export type Mkt = "us" | "kr" | "gold";

// 시장별 개장 여부 — 각 시장 현지시간 기준으로 판별
function isOpen(market: Mkt): boolean {
  const tz = market === "kr" ? "Asia/Seoul" : "America/New_York";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  let hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (hh === 24) hh = 0;
  const mins = hh * 60 + mm;
  const weekend = wd === "Sat" || wd === "Sun";

  if (market === "kr") {
    // KRX 09:00–15:30 KST (월–금)
    return !weekend && mins >= 9 * 60 && mins < 15 * 60 + 30;
  }
  if (market === "us") {
    // 미국 정규장 09:30–16:00 ET (월–금)
    return !weekend && mins >= 9 * 60 + 30 && mins < 16 * 60;
  }
  // 금(COMEX): 일 18:00 ET ~ 금 17:00 ET, 매일 17:00–18:00 휴장
  if (wd === "Sat") return false;
  if (wd === "Sun") return mins >= 18 * 60;
  if (wd === "Fri") return mins < 17 * 60;
  return !(mins >= 17 * 60 && mins < 18 * 60);
}

// 장중(초록 점 펄스 + "장중") / 장마감(회색 점 + "장마감") — 30초마다 갱신
export default function MarketStatus({ market }: { market: Mkt }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isOpen(market));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [market]);

  if (open === null) return null; // 하이드레이션 안전

  return (
    <span className="flex items-center gap-1 text-[9px] font-medium leading-none">
      <span className="relative flex h-1.5 w-1.5">
        {open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            open ? "bg-emerald-500" : "bg-navy-300"
          }`}
        />
      </span>
      <span className={open ? "text-emerald-600" : "text-ink-500"}>{open ? "장중" : "장마감"}</span>
    </span>
  );
}
