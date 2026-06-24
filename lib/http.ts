// 외부 JSON API용 공용 fetch 래퍼 — 타임아웃 + no-store + 상태 체크.
// market.ts / ticker.ts 등에서 동일 구현이 중복되던 것을 한 곳으로 모은다.
export async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}
