import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 운영자 초기 비밀번호는 환경변수로만 주입 (하드코딩 금지 — 계정 탈취 방지)
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error(
      "ADMIN_INITIAL_PASSWORD 환경변수(12자 이상)가 필요합니다. 예: ADMIN_INITIAL_PASSWORD=... npx tsx prisma/seed-welcome.ts"
    );
  }
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@cryptalk.local";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash }, // 기존 계정도 새 비번으로 회전 (과거 약한 비번 무효화)
    create: { email: adminEmail, nickname: "운영자", passwordHash, level: 10 },
  });
  const board = await prisma.board.findUniqueOrThrow({ where: { slug: "free" } });
  const exists = await prisma.post.findFirst({ where: { isNotice: true, boardId: board.id } });
  if (!exists) {
    await prisma.post.create({
      data: {
        boardId: board.id,
        userId: admin.id,
        isNotice: true,
        title: "Cryptalk 자유게시판 오픈 안내",
        content:
          "Cryptalk 자유게시판이 오픈했습니다.\n\n- 상단 티커와 우측 위젯에서 실시간 시세와 김치프리미엄을 확인할 수 있습니다.\n- 글 작성 +5P, 댓글 작성 +2P가 적립됩니다.\n- 건전한 커뮤니티 문화를 위해 서로 존중해 주세요.",
      },
    });
    console.log("Welcome notice created");
  } else {
    console.log("Notice already exists");
  }
}

main().then(() => prisma.$disconnect());
