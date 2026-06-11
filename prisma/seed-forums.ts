import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FORUMS: [symbol: string, name: string][] = [
  ["BTC", "비트코인"],
  ["ETH", "이더리움"],
  ["XRP", "리플"],
  ["SOL", "솔라나"],
  ["ADA", "에이다"],
  ["DOGE", "도지코인"],
  ["TRX", "트론"],
  ["ETC", "이더리움클래식"],
  ["BCH", "비트코인캐시"],
];

async function main() {
  for (const [i, [symbol, name]] of FORUMS.entries()) {
    await prisma.board.upsert({
      where: { slug: symbol.toLowerCase() },
      update: { type: "forum", coinSymbol: symbol },
      create: {
        slug: symbol.toLowerCase(),
        name: `${name} 포럼`,
        type: "forum",
        coinSymbol: symbol,
        sortOrder: 10 + i,
      },
    });
  }
  console.log(`Seeded ${FORUMS.length} coin forums`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
