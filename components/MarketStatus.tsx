"use client";

import { useEffect, useState } from "react";
import { isMarketOpen, type Mkt } from "@/lib/market-hours";

export type { Mkt };

// 장중(초록 점 펄스 + "장중") / 장마감(회색 점 + "장마감") — 30초마다 갱신
export default function MarketStatus({ market }: { market: Mkt }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isMarketOpen(market));
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
