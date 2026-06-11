import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const priceArg = parseFloat(process.argv[2] ?? "");
  if (!priceArg) throw new Error("사용법: tsx prisma/seed-analysis.ts <BTC_KRW_가격>");

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@cryptalk.local" } });
  const board = await prisma.board.findUniqueOrThrow({ where: { slug: "analysis" } });

  const exists = await prisma.post.findFirst({ where: { boardId: board.id } });
  if (exists) {
    console.log("Analysis sample already exists");
    return;
  }

  await prisma.post.create({
    data: {
      boardId: board.id,
      userId: admin.id,
      title: "6월 둘째 주 BTC 주간 브리핑 — FOMC 앞둔 박스권",
      content: [
        "## 요약",
        "BTC는 6/10 CPI 발표를 무난히 소화하며 9,300만 원대 박스권을 유지 중입니다. 6/17 FOMC 금리 결정 전까지는 방향성 탐색 구간으로 판단합니다.",
        "",
        "## 체크포인트",
        "- 김치프리미엄: 최근 마이너스권(-1%대) — 국내 매수세 약화 신호",
        "- 6/11 PPI, 6/17 FOMC가 단기 변동성 트리거 (캘린더 참고)",
        "- 6월 중순 SPK·ZRO 등 대형 언락 일정 주의",
        "",
        "## 시나리오",
        "FOMC 이후 도미넌스 흐름을 확인하고 분할 대응을 권장합니다. 본 분석 작성 시점의 BTC 가격이 자동 기록되어 이후 실제 가격과 비교됩니다.",
        "",
        "출처: 업비트/바이낸스 시세, LAYER.GG 6월 캘린더",
      ].join("\n"),
      priceAtPost: priceArg,
      priceSymbol: "BTC",
    },
  });
  console.log(`Analysis sample created (BTC @ ${priceArg.toLocaleString()} KRW)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
