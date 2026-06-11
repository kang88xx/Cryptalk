import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 직접 검증한 이벤트 → 공식 출처로 교체 (검증일: 2026-06-11)
// 미검증 이벤트는 기존 LAYER.GG 출처 유지
type Update = {
  ticker: string;
  titleStartsWith: string;
  sourceUrl: string;
  description?: string;
  newDay?: number;
};

const UPDATES: Update[] = [
  {
    ticker: "US",
    titleStartsWith: "CPI",
    sourceUrl: "https://www.bls.gov/schedule/news_release/cpi.htm",
    description: "미국 5월 소비자물가지수(CPI) 발표 (미 노동통계국 공식 일정). 시장 변동성 주의.",
  },
  {
    ticker: "US",
    titleStartsWith: "PPI",
    sourceUrl: "https://www.bls.gov/schedule/news_release/ppi.htm",
    description: "미국 5월 생산자물가지수(PPI) 발표, 6/11 08:30 ET (미 노동통계국 공식 일정).",
  },
  {
    ticker: "US",
    titleStartsWith: "JOLTS",
    sourceUrl: "https://www.bls.gov/schedule/news_release/jolts.htm",
    description: "미국 5월 JOLTS 구인 보고서 발표, 6/30 10:00 ET (미 노동통계국 공식 일정).",
  },
  {
    ticker: "US",
    titleStartsWith: "PCE",
    sourceUrl: "https://www.bea.gov/news/schedule",
    description: "미국 개인소비지출(PCE) 물가지수 발표, 6/25 08:30 ET (미 경제분석국 공식 일정). 연준이 선호하는 물가지표.",
  },
  {
    ticker: "FOMC",
    titleStartsWith: "Interest Rates",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "6/16~17 FOMC 회의. 17일 14:00 ET 금리 결정·경제전망(점도표) 발표 — 이달 최대 변동성 이벤트 (연준 공식 일정).",
  },
  {
    ticker: "JP",
    titleStartsWith: "BoJ",
    sourceUrl: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    description: "일본은행 금융정책결정회의 6/15~16, 결과는 16일 발표 (BoJ 공식 일정).",
    newDay: 16,
  },
  {
    ticker: "WORLDCUP",
    titleStartsWith: "FIFA",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/estadio-azteca-mexico-city-host-opening-match-world-cup-2026",
    description: "FIFA 월드컵 2026 개막 — 6/11 멕시코시티 아스테카 스타디움, 개막전 멕시코 vs 남아공. 결승은 7/19 뉴욕/뉴저지 (FIFA 공식).",
  },
  {
    ticker: "SPCX",
    titleStartsWith: "SpaceX IPO",
    sourceUrl: "https://www.cnbc.com/2026/06/03/spacex-ipo-stock-price-roadshow-musk.html",
    description: "스페이스X 나스닥 상장(티커 SPCX). 공모가 $135, 기업가치 약 1.75조 달러 — 역대 최대 IPO. 6/11 가격 확정 후 6/12 첫 거래 (CNBC).",
  },
  {
    ticker: "SPCX",
    titleStartsWith: "SpaceX Road Show",
    sourceUrl: "https://www.cnbc.com/2026/06/03/spacex-ipo-stock-price-roadshow-musk.html",
    description: "스페이스X IPO 로드쇼 — 공모가 $135 목표로 투자자 대상 설명회 진행 (CNBC).",
  },
  {
    ticker: "OXT",
    titleStartsWith: "Delisted",
    sourceUrl: "https://en.bloomingbit.io/feed/news/113135",
    description: "업비트 오키드(OXT) 거래지원 종료 — 6/29 15:00 (업비트 공지 보도).",
  },
  {
    ticker: "ZRO",
    titleStartsWith: "$29",
    sourceUrl: "https://defillama.com/unlocks",
    description: "ZRO(LayerZero) 약 2,930만 달러 규모 물량 언락 (DefiLlama 언락 트래커 기준).",
  },
  {
    ticker: "SPK",
    titleStartsWith: "$21",
    sourceUrl: "https://defillama.com/unlocks",
    description: "SPK 약 2,115만 달러(유통량의 약 27%) 물량 언락 — 시총 대비 비중이 커 공급 압력 주의 (DefiLlama 언락 트래커 기준).",
  },
  {
    ticker: "KR",
    titleStartsWith: "South Korean",
    sourceUrl: "https://ko.wikipedia.org/wiki/%EC%A0%9C9%ED%9A%8C_%EC%A0%84%EA%B5%AD%EB%8F%99%EC%8B%9C%EC%A7%80%EB%B0%A9%EC%84%A0%EA%B1%B0",
    description: "제9회 전국동시지방선거 (2026-06-03).",
  },
];

async function main() {
  let updated = 0;
  for (const u of UPDATES) {
    const events = await prisma.calendarEvent.findMany({
      where: { ticker: u.ticker, title: { startsWith: u.titleStartsWith } },
    });
    for (const ev of events) {
      await prisma.calendarEvent.update({
        where: { id: ev.id },
        data: {
          sourceUrl: u.sourceUrl,
          ...(u.description ? { description: u.description } : {}),
          ...(u.newDay != null
            ? { date: new Date(Date.UTC(ev.date.getUTCFullYear(), ev.date.getUTCMonth(), u.newDay)) }
            : {}),
        },
      });
      updated++;
      console.log(`✓ ${u.ticker} ${ev.title}`);
    }
  }
  const remaining = await prisma.calendarEvent.count({
    where: { sourceUrl: { contains: "x.com" } },
  });
  console.log(`\n업데이트 ${updated}건 / LAYER.GG 출처 유지 ${remaining}건`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
