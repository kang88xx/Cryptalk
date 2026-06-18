import { prisma } from "@/lib/prisma";

// 서버리스 인스턴스 간 공유 캐시 (DB 백엔드).
// 요청 시점에는 캐시만 읽고, 만료 시에만 inline 갱신(stale-while-revalidate).
// 프로덕션에서는 Vercel Cron이 미리 갱신해 두므로 inline 갱신은 거의 발생하지 않는다.
// 같은 인스턴스 내 동시 요청은 inflight로 합쳐 외부 호출/DB write 폭주를 막는다.

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
    // DB 조회 실패 → 직접 fetch로 폴백
    return fetcher();
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
  } catch {
    if (row) return row.data as T; // 갱신 실패 시 stale 반환
    throw new Error(`marketCache:${key} 사용 불가`);
  }
}
