import { prisma } from "@/lib/prisma";

// 서버리스 인스턴스 간 공유 캐시 (DB 백엔드).
// 요청 시점에는 캐시만 읽고, 만료 시에만 inline 갱신(stale-while-revalidate).
// (무료플랜의 Vercel Cron은 하루 1회뿐이라, 실제로는 만료 후 첫 방문자 요청 때 inline 갱신되는
//  것이 주 경로다. TTL과 inflight 합치기로 외부 호출/DB write 빈도를 억제한다.)
// 같은 인스턴스 내 동시 요청·DB 조회 실패 시에도 inflight로 합쳐 호출 폭주를 막는다.

const inflight = new Map<string, Promise<unknown>>();

export async function cachedJson<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  let row: { data: unknown; updatedAt: Date } | null = null;
  try {
    row = await prisma.marketCache.findUnique({
      where: { key },
      select: { data: true, updatedAt: true },
    });
  } catch {
    // DB 조회 실패 → row=null 유지하고 아래 inflight 경유로 갱신(동시 요청 합쳐 호출 폭주 방지)
  }

  const fresh = row && Date.now() - row.updatedAt.getTime() < ttlMs;
  if (fresh) return row!.data as T;

  // 만료/미존재 → 갱신 (인스턴스 내 중복 갱신 합치기)
  if (!inflight.has(key)) {
    const p = (async () => {
      const data = await fetcher();
      await prisma.marketCache
        .upsert({
          where: { key },
          update: { data: data as object },
          create: { key, data: data as object },
        })
        .catch(() => {});
      return data;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }

  try {
    return (await inflight.get(key)!) as T;
  } catch (err) {
    if (row) {
      // 갱신 실패 → 직전 데이터(stale) 반환. 조용히 넘기지 말고 경고로 남겨 만료 누적을 감지한다.
      const ageMin = Math.round((Date.now() - row.updatedAt.getTime()) / 60000);
      console.warn(`[cache] ${key} 갱신 실패 → stale 반환 (${ageMin}분 경과)`, err);
      return row.data as T;
    }
    console.error(`[cache] ${key} 갱신 실패 + 직전 데이터 없음`, err);
    throw new Error(`marketCache:${key} 사용 불가`);
  }
}
