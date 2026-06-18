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
