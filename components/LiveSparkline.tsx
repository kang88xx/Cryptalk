"use client";

import { useEffect, useState } from "react";
import Sparkline from "@/components/Sparkline";
import { isMarketOpen, type Mkt } from "@/lib/market-hours";

// 마켓바 미니차트 — 장중이면 끝점에 진행중 펄스, 장마감이면 정적 점
export default function LiveSparkline({
  market,
  values,
  width = 56,
  height = 26,
  stroke,
}: {
  market: Mkt;
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const [open, setOpen] = useState(false); // 하이드레이션 안전: 초기엔 정적

  useEffect(() => {
    const update = () => {
      if (typeof document !== "undefined" && document.hidden) return; // 백그라운드 탭은 폴링 정지
      setOpen(isMarketOpen(market));
    };
    update();
    const id = setInterval(update, 30_000);
    const onVisible = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [market]);

  return <Sparkline values={values} width={width} height={height} stroke={stroke} pulse={open} />;
}
