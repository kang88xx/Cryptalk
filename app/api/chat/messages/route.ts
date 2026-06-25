import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkChatLimit } from "@/lib/chatLimit";

export const dynamic = "force-dynamic";

const PAGE = 50; // 최초 로드 시 가져올 최근 메시지 수
const MAX_LEN = 500; // 메시지 최대 길이

// 메시지 조회 — after(마지막으로 받은 id)가 있으면 그 이후 신규만, 없으면 최근 PAGE개.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const afterRaw = searchParams.get("after");
  const after = afterRaw ? parseInt(afterRaw, 10) : NaN;

  if (Number.isFinite(after)) {
    // 폴링: after 이후 신규 메시지만 오름차순으로
    const messages = await prisma.chatMessage.findMany({
      where: { id: { gt: after } },
      orderBy: { id: "asc" },
      take: 200,
    });
    return NextResponse.json({ messages });
  }

  // 최초 로드: 최근 PAGE개를 내림차순으로 받아 오름차순으로 뒤집어 반환
  const latest = await prisma.chatMessage.findMany({
    orderBy: { id: "desc" },
    take: PAGE,
  });
  return NextResponse.json({ messages: latest.reverse() });
}

// 메시지 전송 — 로그인 필요, 사용자당 레이트리밋.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 도배 방지 누진 제재 — 연속 3회→10초, 반복→30초, 비정상 반복→1시간
  const limit = await checkChatLimit(session.user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
  }
  if (content.length > MAX_LEN) {
    return NextResponse.json({ error: `메시지는 ${MAX_LEN}자 이하로 입력해 주세요.` }, { status: 400 });
  }

  // 닉네임/레벨은 작성 시점 스냅샷으로 저장 (폴링마다 조인 제거)
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nickname: true, level: true },
  });
  if (!me) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      nickname: me.nickname,
      level: me.level,
      content,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
