"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BOX_COST, RARITIES, type Rarity } from "@/lib/box";

const POINTS = { post: 5, comment: 2, attendance: 10 };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

// KST 자정의 UTC 시각
function kstDayStartUtc(): Date {
  const kn = new Date(Date.now() + 9 * 3600_000);
  return new Date(Date.UTC(kn.getUTCFullYear(), kn.getUTCMonth(), kn.getUTCDate()) - 9 * 3600_000);
}

// 글/댓글 포인트 일일 적립 횟수 상한 (포인트 파밍 방지 — 작성 자체는 막지 않음)
const DAILY_POINT_CAP: Record<string, number> = { post: 10, comment: 20 };

async function underDailyPointCap(userId: string, action: "post" | "comment"): Promise<boolean> {
  const count = await prisma.pointLog.count({
    where: { userId, action, createdAt: { gte: kstDayStartUtc() } },
  });
  return count < DAILY_POINT_CAP[action];
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
  if (await underDailyPointCap(userId, "post")) await awardPoints(userId, "post", POINTS.post);

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
  if (await underDailyPointCap(userId, "comment")) await awardPoints(userId, "comment", POINTS.comment);

  revalidatePath(`/free/${postId}`);
}

// 코인·주식·해외 종목 자유 입력 (티커에 있는 심볼은 현재가 자동 평가)
function parsePortfolioInput(formData: FormData) {
  const symbol = String(formData.get("symbol") ?? "").toUpperCase().trim();
  const quantity = parseFloat(String(formData.get("quantity") ?? ""));
  const buyPrice = parseFloat(String(formData.get("buyPrice") ?? ""));
  const currency = formData.get("currency") === "USD" ? "USD" : "KRW";

  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    throw new Error("종목 심볼은 영문/숫자 1~12자로 입력해 주세요. (예: BTC, AAPL)");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("수량을 올바르게 입력해 주세요.");
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) throw new Error("단가를 올바르게 입력해 주세요.");

  return { symbol, quantity, buyPrice, currency };
}

export async function addPortfolioItem(formData: FormData) {
  const userId = await requireUserId();
  const data = parsePortfolioInput(formData);
  await prisma.portfolioItem.create({ data: { userId, ...data } });
  revalidatePath("/dashboard");
}

export async function updatePortfolioItem(id: number, formData: FormData) {
  const userId = await requireUserId();
  const data = parsePortfolioInput(formData);
  await prisma.portfolioItem.updateMany({ where: { id, userId }, data });
  revalidatePath("/dashboard");
}

export async function deletePortfolioItem(id: number) {
  const userId = await requireUserId();
  await prisma.portfolioItem.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
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

  try {
    await prisma.$transaction([
      prisma.vote.create({ data: { postId, userId, value } }),
      prisma.post.update({
        where: { id: postId },
        data: value === 1 ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // 동시 투표 race — 유니크 제약(P2002) 위반은 "이미 투표"로 정상 처리
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false as const, message: "이미 투표한 글입니다." };
    }
    throw e;
  }

  revalidatePath(`/free/${postId}`);
  return { ok: true as const, message: value === 1 ? "추천했습니다." : "비추천했습니다." };
}

export async function logout() {
  const { signOut } = await import("@/lib/auth");
  await signOut({ redirectTo: "/" });
}

/* ───────────────────────── 랜덤박스 / 어드민 상품 ───────────────────────── */

// 운영진(Lv10+)만 어드민 — 별도 role 컬럼 없이 기존 레벨 관례 재사용
async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
  if (!me || me.level < EDITOR_MIN_LEVEL) {
    throw new Error("운영진만 접근할 수 있습니다.");
  }
  return userId;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { level: true },
  });
  return !!me && me.level >= EDITOR_MIN_LEVEL;
}

// 업데이트 버튼 — 시세 캐시를 비우고 강제로 새 데이터를 받아오게 한 뒤 전체 재검증.
// (무거운 스크랩 listings-v3·bubbles는 제외 — 해당 페이지에서만 필요)
const MARKET_CACHE_KEYS = [
  "marketbar",
  "tickers",
  "exchange",
  "overview",
  "fxHistory",
  "kimchi",
  "radar",
  "spread",
  "krwStats",
  "trend",
];

export async function refreshMarketData(): Promise<void> {
  try {
    await prisma.marketCache.deleteMany({ where: { key: { in: MARKET_CACHE_KEYS } } });
  } catch {
    // 캐시 비우기 실패는 무시 — 재검증은 그대로 진행
  }
  revalidatePath("/", "layout");
}

type PrizeLite = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string;
};

type BoxResult =
  | { ok: true; prize: PrizeLite; points: number }
  | { ok: false; message: string };

// 랜덤박스 오픈: 가중치 추첨 → (포인트 차감 · 재고 차감 · 당첨내역 · 로그)를 트랜잭션으로 원자 처리.
// 추첨 결과는 전적으로 서버에서 결정 — 클라이언트는 연출만 담당.
export async function openRandomBox(): Promise<BoxResult> {
  const userId = await requireUserId();

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!me) return { ok: false, message: "사용자를 찾을 수 없습니다." };
  if (me.points < BOX_COST) {
    return { ok: false, message: `포인트가 부족합니다. (${BOX_COST}P 필요)` };
  }

  // 활성 + 재고 남은 상품만 후보
  const pool = await prisma.prize.findMany({
    where: { active: true, OR: [{ stock: null }, { stock: { gt: 0 } }] },
    select: { id: true, name: true, description: true, imageUrl: true, rarity: true, weight: true, stock: true },
  });
  if (pool.length === 0) return { ok: false, message: "등록된 상품이 없습니다." };

  // 가중치 룰렛
  const total = pool.reduce((s, p) => s + Math.max(1, p.weight), 0);
  let roll = Math.random() * total;
  let picked = pool[pool.length - 1];
  for (const p of pool) {
    roll -= Math.max(1, p.weight);
    if (roll <= 0) {
      picked = p;
      break;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 포인트 차감 — 잔액 가드(동시 오픈 시 음수 방지)
      const dec = await tx.user.updateMany({
        where: { id: userId, points: { gte: BOX_COST } },
        data: { points: { decrement: BOX_COST } },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");

      // 재고 차감 — 한정 상품이면 0 이하로 못 내려가게 가드
      if (picked.stock != null) {
        const s = await tx.prize.updateMany({
          where: { id: picked.id, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (s.count === 0) throw new Error("SOLD_OUT");
      }

      await tx.prizeWin.create({ data: { userId, prizeId: picked.id, cost: BOX_COST } });
      await tx.pointLog.create({ data: { userId, action: "box", delta: -BOX_COST } });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INSUFFICIENT") return { ok: false, message: "포인트가 부족합니다." };
    if (msg === "SOLD_OUT") return { ok: false, message: "방금 상품이 소진됐어요. 다시 시도해 주세요." };
    throw e;
  }

  revalidatePath("/box");
  return {
    ok: true,
    points: me.points - BOX_COST,
    prize: {
      id: picked.id,
      name: picked.name,
      description: picked.description,
      imageUrl: picked.imageUrl,
      rarity: picked.rarity,
    },
  };
}

// ── 어드민: 상품 등록/수정/삭제 ──

function parsePrizeInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const rarityRaw = String(formData.get("rarity") ?? "common");
  const rarity: Rarity = (RARITIES as readonly string[]).includes(rarityRaw)
    ? (rarityRaw as Rarity)
    : "common";
  const weight = Math.max(1, Math.min(1_000_000, parseInt(String(formData.get("weight") ?? "100"), 10) || 100));
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const stock = stockRaw === "" ? null : Math.max(0, parseInt(stockRaw, 10) || 0);
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10) || 0;
  const active = formData.get("active") != null;

  if (!name || name.length > 80) throw new Error("상품명은 1~80자로 입력해 주세요.");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) throw new Error("이미지 URL은 http(s)로 시작해야 합니다.");

  return { name, description, imageUrl, rarity, weight, stock, sortOrder, active };
}

export async function createPrize(formData: FormData) {
  await requireAdmin();
  const data = parsePrizeInput(formData);
  await prisma.prize.create({ data });
  revalidatePath("/admin/prizes");
  revalidatePath("/box");
}

export async function updatePrize(id: number, formData: FormData) {
  await requireAdmin();
  const data = parsePrizeInput(formData);
  await prisma.prize.update({ where: { id }, data });
  revalidatePath("/admin/prizes");
  revalidatePath("/box");
}

export async function deletePrize(id: number) {
  await requireAdmin();
  // 당첨 이력이 있으면 비활성화로 보존(외래키·통계 보호), 없으면 완전 삭제
  const wins = await prisma.prizeWin.count({ where: { prizeId: id } });
  if (wins > 0) {
    await prisma.prize.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.prize.delete({ where: { id } });
  }
  revalidatePath("/admin/prizes");
  revalidatePath("/box");
}
