"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const POINTS = { post: 5, comment: 2, attendance: 10 };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

// 포인트 적립 + 로그 + 레벨 자동 상승. day가 있으면 (userId, action, day) 유니크 — 출석 중복 방지
async function awardPoints(
  userId: string,
  action: string,
  delta: number,
  day?: string
): Promise<boolean> {
  try {
    await prisma.pointLog.create({ data: { userId, action, delta, day } });
  } catch {
    return false;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: delta } },
  });
  // 100포인트당 1레벨 (최대 Lv9, Lv10+는 운영진 전용이라 건드리지 않음)
  if (user.level < EDITOR_MIN_LEVEL) {
    const level = Math.min(9, Math.floor(user.points / 100) + 1);
    if (level !== user.level) {
      await prisma.user.update({ where: { id: userId }, data: { level } });
    }
  }
  return true;
}

const EDITOR_MIN_LEVEL = 10;

export async function createPost(formData: FormData) {
  const userId = await requireUserId();
  const boardSlug = String(formData.get("board") ?? "free");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || title.length > 100) throw new Error("제목은 1~100자로 입력해 주세요.");
  if (!content || content.length > 20000) throw new Error("내용을 입력해 주세요.");

  const board = await prisma.board.findUnique({ where: { slug: boardSlug } });
  if (!board) throw new Error("게시판을 찾을 수 없습니다.");

  // 시장 분석 게시판: 운영진 전용 + 작성 시점 가격 자동 기록 (예측 검증용)
  let priceAtPost: number | null = null;
  let priceSymbol: string | null = null;
  if (board.slug === "analysis") {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
    if (!me || me.level < EDITOR_MIN_LEVEL) {
      throw new Error("시장 분석 글은 운영진만 작성할 수 있습니다.");
    }
    const symbol = String(formData.get("symbol") ?? "BTC");
    const { getTickers } = await import("@/lib/ticker");
    const snapshot = await getTickers();
    const ticker = snapshot.tickers.find((t) => t.symbol === symbol);
    if (ticker?.priceKrw != null) {
      priceAtPost = ticker.priceKrw;
      priceSymbol = symbol;
    }
  }

  const post = await prisma.post.create({
    data: { boardId: board.id, userId, title, content, priceAtPost, priceSymbol },
  });
  await awardPoints(userId, "post", POINTS.post);

  const basePath = board.type === "forum" ? `/forum/${board.slug}` : `/${board.slug}`;
  revalidatePath(basePath);
  redirect(`${basePath}/${post.id}`);
}

export async function createComment(postId: number, formData: FormData) {
  const userId = await requireUserId();
  const content = String(formData.get("content") ?? "").trim();
  if (!content || content.length > 2000) throw new Error("댓글 내용을 입력해 주세요.");

  await prisma.$transaction([
    prisma.comment.create({ data: { postId, userId, content } }),
    prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    }),
  ]);
  await awardPoints(userId, "comment", POINTS.comment);

  revalidatePath(`/free/${postId}`);
}

export async function checkAttendance() {
  const userId = await requireUserId();
  const day = kstToday();
  const ok = await awardPoints(userId, "attendance", POINTS.attendance, day);
  revalidatePath("/attendance");
  return ok
    ? { ok: true as const, message: "출석 완료! +10P 적립되었습니다." }
    : { ok: false as const, message: "오늘은 이미 출석했습니다." };
}

export async function votePost(postId: number, value: 1 | -1) {
  const userId = await requireUserId();

  const existing = await prisma.vote.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    return { ok: false as const, message: "이미 투표한 글입니다." };
  }

  await prisma.$transaction([
    prisma.vote.create({ data: { postId, userId, value } }),
    prisma.post.update({
      where: { id: postId },
      data: value === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/free/${postId}`);
  return { ok: true as const, message: value === 1 ? "추천했습니다." : "비추천했습니다." };
}

export async function logout() {
  const { signOut } = await import("@/lib/auth");
  await signOut({ redirectTo: "/" });
}
