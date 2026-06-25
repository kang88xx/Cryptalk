import { prisma } from "@/lib/prisma";

// 도배 방지 누진 제재 파라미터
const BURST_WINDOW_MS = 5_000; // 이 시간(5초) 안에
const BURST_LIMIT = 3; // 3번까지 허용, 3번째에서 쿨다운 부여
const ESCALATION_MEMORY_MS = 5 * 60_000; // 5분 내 재범이면 단계 상승, 아니면 초기화
const BAN_MS_BY_OFFENSE = [10_000, 30_000, 3_600_000]; // 1:10초 · 2:30초 · 3+:1시간

export type ChatLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; reason: string };

function human(sec: number): string {
  if (sec >= 3600) return `${Math.ceil(sec / 3600)}시간`;
  if (sec >= 60) return `${Math.ceil(sec / 60)}분`;
  return `${sec}초`;
}

function blockedReason(offenses: number, sec: number): string {
  if (offenses >= 3) return `비정상적인 도배 행위로 ${human(sec)} 동안 채팅이 제한됩니다.`;
  if (offenses === 2) return `반복적인 도배로 ${human(sec)} 동안 채팅이 제한됩니다.`;
  return `도배 방지로 ${human(sec)} 동안 채팅이 제한됩니다.`;
}

// 메시지 전송 직전 호출. 통과 여부와 제재 시 남은 시간/사유를 반환한다.
// 단일 사용자 행(row)을 트랜잭션으로 읽고 갱신해 동시 요청에도 일관되게 동작한다.
export async function checkChatLimit(userId: string, at?: Date): Promise<ChatLimitResult> {
  const now = at ?? new Date();
  const nowMs = now.getTime();

  return prisma.$transaction(async (tx) => {
    const row = await tx.chatLimit.findUnique({ where: { userId } });

    // 1) 제재 중이면 차단
    if (row?.bannedUntil && row.bannedUntil.getTime() > nowMs) {
      const sec = Math.ceil((row.bannedUntil.getTime() - nowMs) / 1000);
      return { allowed: false, retryAfterSec: sec, reason: blockedReason(row.offenses, sec) };
    }

    // 2) 버스트 윈도우 카운트
    const inWindow = !!row && nowMs - row.windowStart.getTime() <= BURST_WINDOW_MS;
    const recentCount = inWindow ? row!.recentCount + 1 : 1;
    const windowStart = inWindow ? row!.windowStart : now;

    // 3) 위반 이력(에스컬레이션) 메모리 — 최근이면 단계 누적, 오래되면 초기화
    const recentOffense =
      !!row?.lastOffense && nowMs - row.lastOffense.getTime() <= ESCALATION_MEMORY_MS;
    const baseOffenses = recentOffense ? row!.offenses : 0;

    // 4) 임계 도달 — 이 메시지는 통과시키되 다음부터 쿨다운(밴) 부여
    if (recentCount >= BURST_LIMIT) {
      const offenses = baseOffenses + 1;
      const banMs = BAN_MS_BY_OFFENSE[Math.min(offenses, BAN_MS_BY_OFFENSE.length) - 1];
      const bannedUntil = new Date(nowMs + banMs);
      await tx.chatLimit.upsert({
        where: { userId },
        create: { userId, recentCount: 0, windowStart: now, bannedUntil, offenses, lastOffense: now },
        update: { recentCount: 0, windowStart: now, bannedUntil, offenses, lastOffense: now },
      });
      return { allowed: true };
    }

    // 5) 통과 — 카운트만 갱신
    await tx.chatLimit.upsert({
      where: { userId },
      create: { userId, recentCount, windowStart, offenses: baseOffenses, lastOffense: recentOffense ? row!.lastOffense : null },
      update: { recentCount, windowStart, bannedUntil: null, offenses: baseOffenses },
    });
    return { allowed: true };
  });
}
