import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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

  const dup = await prisma.user.findFirst({
    where: { OR: [{ email }, { nickname }] },
    select: { email: true, nickname: true },
  });
  if (dup) {
    const field = dup.email === email ? "이미 사용 중인 이메일입니다." : "이미 사용 중인 닉네임입니다.";
    return NextResponse.json({ error: field }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, nickname, passwordHash } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
