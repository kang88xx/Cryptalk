import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@cryptalk.local" },
    update: {},
    create: {
      email: "admin@cryptalk.local",
      nickname: "운영자",
      passwordHash: await bcrypt.hash("cryptalk-admin-1234", 10),
      level: 10,
    },
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
