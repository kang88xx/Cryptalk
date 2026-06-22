export type Mkt = "us" | "kr" | "gold";

// 시장별 개장 여부 — 각 시장 현지시간 기준으로 판별
export function isMarketOpen(market: Mkt): boolean {
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
