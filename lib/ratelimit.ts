import { prisma } from "@/lib/prisma";

// 고정창(fixed-window) 레이트리밋. 허용 시 true, 한도 초과 시 false.
// 기본은 저장소 오류 시 막지 않는다(fail-open, 가용성 우선). 단 로그인/가입 등
// 보안 민감 키는 failClosed=true로 호출해 저장소 장애를 우회 통로로 쓰지 못하게 한다.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  failClosed = false
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
    return !failClosed; // 저장소 오류: 기본 통과(가용성), 보안 민감 키는 차단
  }
}

// 요청에서 클라이언트 IP 추출.
// Vercel이 부여하는 신뢰 헤더(x-vercel-forwarded-for / x-real-ip)를 우선한다.
// x-forwarded-for 선두 값은 클라이언트가 위조해 채울 수 있어(레이트리밋 우회) 최후순위.
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}
