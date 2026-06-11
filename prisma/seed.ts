import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.board.upsert({
    where: { slug: "free" },
    update: {},
    create: { slug: "free", name: "자유게시판", sortOrder: 1 },
  });
  console.log("Seeded: 자유게시판 (free)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
