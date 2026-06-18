// KST 기준 "오늘부터 days일" UTC 범위.
// Date.now()를 lib 함수로 격리 — 서버 컴포넌트 렌더 본문에서 직접 호출 시
// react-hooks/purity 린트에 걸리는 것을 피하는 목적도 겸한다.
const KST = 9 * 3600_000;

export function upcomingKstRange(days: number): { now: number; startUtc: Date; endUtc: Date } {
  const now = Date.now();
  const kn = new Date(now + KST);
  const startUtc = new Date(Date.UTC(kn.getUTCFullYear(), kn.getUTCMonth(), kn.getUTCDate()) - KST);
  const endUtc = new Date(startUtc.getTime() + days * 86400_000);
  return { now, startUtc, endUtc };
}

// "오늘부터 days일" UTC 범위 — 이벤트는 UTC(통상) 날짜로 나열한다.
// (FOMC 등 미국 매크로 이벤트의 통상 날짜 = UTC 날짜. 한국시간은 보조 표기)
export function upcomingUtcRange(days: number): { now: number; startUtc: Date; endUtc: Date } {
  const now = Date.now();
  const d = new Date(now);
  const startUtc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endUtc = new Date(startUtc.getTime() + days * 86400_000);
  return { now, startUtc, endUtc };
}

// 이벤트(UTC 인스턴트)의 KST 시각 라벨 + 익일 여부.
// 시각 미지정(00:00 UTC)이면 null. UTC 15시 이후면 KST로는 다음 날.
export function kstTimeLabel(date: Date): { time: string | null; nextDay: boolean } {
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) return { time: null, nextDay: false };
  const k = new Date(date.getTime() + KST);
  const time = `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
  return { time, nextDay: date.getUTCHours() >= 15 };
}
