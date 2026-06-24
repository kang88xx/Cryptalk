import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // IP당 가입 남용 방지 — 1시간 5회. 저장소 장애 시 fail-closed(우회 차단).
  if (!(await checkRateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000, true))) {
    return NextResponse.json(
      { error: "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: { email?: string; nickname?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const nickname = body.nickname?.trim();
  const password = body.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력해 주세요." }, { status: 400 });
  }
  if (!nickname || nickname.length < 2 || nickname.length > 12) {
    return NextResponse.json({ error: "닉네임은 2~12자로 입력해 주세요." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  // bcrypt는 72바이트 초과분을 조용히 버린다 — 그 전에 거부해 엔트로피 손실/혼동 방지
  if (Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ error: "비밀번호가 너무 깁니다. (72바이트 이하)" }, { status: 400 });
  }

  const dup = await prisma.user.findFirst({
    where: { OR: [{ email }, { nickname }] },
    select: { email: true, nickname: true },
  });
  if (dup) {
    const field = dup.email === email ? "이미 사용 중인 이메일입니다." : "이미 사용 중인 닉네임입니다.";
    return NextResponse.json({ error: field }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { email, nickname, passwordHash } });
  } catch {
    // 중복 체크와 생성 사이의 동시 가입 (유니크 제약 위반)
    return NextResponse.json(
      { error: "이미 사용 중인 이메일 또는 닉네임입니다." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
