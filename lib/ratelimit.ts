import { prisma } from "@/lib/prisma";

// 고정창(fixed-window) 레이트리밋. 허용 시 true, 한도 초과 시 false.
// 저장소 오류 시에는 막지 않는다(fail-open) — 가용성 우선.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = new Date();
  const reset = new Date(now.getTime() + windowMs);
  try {
    // 1) 만료된 창은 리셋 (count=0, 새 창)
    await prisma.rateLimit.updateMany({
      where: { key, resetAt: { lt: now } },
      data: { count: 0, resetAt: reset },
    });
    // 2) 행 보장
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 0, resetAt: reset },
      update: {},
    });
    // 3) 원자적 조건부 증가 — Postgres가 행을 잠그고 count<limit를 재평가하므로
    //    동시 요청이 한도를 넘겨 통과하지 못한다. 1행 갱신=허용, 0행=한도 도달.
    const res = await prisma.rateLimit.updateMany({
      where: { key, count: { lt: limit } },
      data: { count: { increment: 1 } },
    });
    return res.count === 1;
  } catch {
    return true; // 저장소 오류 시 막지 않음(가용성 우선)
  }
}

// 요청에서 클라이언트 IP 추출 (Vercel은 x-forwarded-for 선두가 실제 클라이언트)
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
