import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE = "https://x.com/layerggofficial/status/2060944634617196698/photo/1";

// LAYER.GG June 2026 Crypto Calendar (updated 5/31)
type Seed = [day: number, ticker: string, title: string, category: string, description: string];

const EVENTS: Seed[] = [
  [1, "BNB", "Binance New Product", "good", "바이낸스가 신규 프로덕트를 공개합니다."],
  [1, "NVDA", "Announcement", "important", "엔비디아 주요 발표가 예정되어 있습니다."],
  [1, "VVV", "Emission Reduction 5M → 4M", "neutral", "VVV 토큰 발행량이 500만 개에서 400만 개로 감축됩니다."],
  [1, "NVDA", "(1~5) Computex & (1~4) GTC", "important", "6/1~5 컴퓨텍스, 6/1~4 GTC 행사가 진행됩니다."],
  [2, "US", "US Spectrum Auction Kicks Off", "important", "미국 주파수 경매가 시작됩니다."],
  [2, "ARX", "Arcium TGE", "good", "Arcium 토큰 제너레이션 이벤트(TGE)가 진행됩니다."],
  [2, "SEI", "Joint Whitepaper with MasterCard", "good", "SEI가 마스터카드와 공동 백서를 발표합니다."],
  [2, "US", "Rubio to Testify", "important", "루비오 미 국무장관 청문회 증언이 예정되어 있습니다."],
  [3, "KR", "South Korean Local Elections", "important", "대한민국 지방선거일입니다."],
  [3, "AVGO", "Earnings Call", "important", "브로드컴 실적 발표가 예정되어 있습니다."],
  [3, "PENGU", "Pudgy Penguins x MetaMask", "neutral", "퍼지펭귄과 메타마스크 협업이 공개됩니다."],
  [4, "SPCX", "SpaceX Road Show", "important", "스페이스X 로드쇼가 진행됩니다."],
  [4, "TEA", "$TEA TGE", "good", "$TEA 토큰 제너레이션 이벤트(TGE)가 진행됩니다."],
  [4, "HOME", "Perps Open - Revenue buyback", "good", "HOME 무기한 선물 오픈 및 수익 바이백이 시작됩니다."],
  [5, "IRAN", "Next US-Iran Meeting", "bad", "미국-이란 차기 회담이 예정되어 있습니다. 지정학 리스크 이벤트."],
  [5, "SUI", "$15.15M (2.07% of Float) Unlock", "bad", "SUI 약 1,515만 달러(유통량의 2.07%) 물량이 언락됩니다."],
  [6, "HYPE", "534k $HYPE (~$34M) Unlock", "bad", "HYPE 53.4만 개(약 3,400만 달러) 물량이 언락됩니다."],
  [7, "OPEC", "OPEC+ Ministerial Meeting on Oil Production", "neutral", "OPEC+ 산유국 장관급 회의가 열립니다."],
  [8, "AAPL", "Special Event at Apple Park", "important", "애플파크에서 애플 스페셜 이벤트가 열립니다."],
  [8, "ETH", "(6/8~6/10) ETH Conf with Wallstreet", "important", "6/8~10 월스트리트와 함께하는 이더리움 컨퍼런스가 진행됩니다."],
  [8, "COIN", "CFTC-regulated Coinbase derivatives trading", "neutral", "CFTC 규제 하의 코인베이스 파생상품 거래가 시작됩니다."],
  [8, "CME", "Nasdaq CME Crypto index futures", "important", "나스닥 CME 크립토 지수 선물이 출시됩니다."],
  [8, "STRC", "Semi-Monthly STRC Dividends Vote Ends", "good", "STRC 반월 배당 투표가 마감됩니다."],
  [10, "US", "CPI", "important", "미국 소비자물가지수(CPI) 발표. 시장 변동성 주의."],
  [10, "ORCL", "Earnings Call", "important", "오라클 실적 발표가 예정되어 있습니다."],
  [10, "MNT", "Hackathon Phase 2 Winner", "good", "맨틀 해커톤 2단계 우승자가 발표됩니다."],
  [11, "US", "PPI", "important", "미국 생산자물가지수(PPI) 발표."],
  [11, "WORLDCUP", "FIFA World Cup 2026", "important", "FIFA 월드컵 2026이 개막합니다."],
  [11, "BELIEVE", "Ben Pasternak in court", "bad", "BELIEVE 관련 벤 파스터낙 법원 출석이 예정되어 있습니다."],
  [12, "RUNE", "(~6/13) Mainnet v3.19 & Trading", "good", "RUNE 메인넷 v3.19 업그레이드(~6/13)가 진행됩니다."],
  [12, "SPCX", "SpaceX IPO", "important", "스페이스X 기업공개(IPO)가 예정되어 있습니다."],
  [15, "JP", "BoJ Rates Decision", "important", "일본은행(BoJ) 금리 결정이 발표됩니다."],
  [15, "NKN", "Delisted by Upbit", "bad", "NKN이 업비트에서 상장폐지됩니다."],
  [17, "FOMC", "Interest Rates", "important", "FOMC 금리 결정 발표. 최대 변동성 이벤트."],
  [17, "SPK", "$21.53M (27.08% of Float) Unlock", "bad", "SPK 약 2,153만 달러(유통량의 27.08%) 물량이 언락됩니다."],
  [18, "MSCI", "Results of the Global Market Accessibility Review", "important", "MSCI 글로벌 시장 접근성 리뷰 결과가 발표됩니다."],
  [20, "ZRO", "$29.56M (4.83% of Float) Unlock", "bad", "ZRO 약 2,956만 달러(유통량의 4.83%) 물량이 언락됩니다."],
  [20, "ENA", "Termination of certain chains & Ether migration Deadline", "neutral", "ENA 일부 체인 종료 및 이더 마이그레이션 마감일입니다."],
  [23, "MEGA", "$15.84M (32.83% of Float) Unlock", "bad", "MEGA 약 1,584만 달러(유통량의 32.83%) 물량이 언락됩니다."],
  [23, "MEGA", "Season 1 Sunset", "bad", "MEGA 시즌 1이 종료됩니다."],
  [23, "MSCI", "Annual Market Classification Review", "important", "MSCI 연례 시장 분류 리뷰가 발표됩니다."],
  [24, "MU", "Earnings Call", "important", "마이크론 실적 발표가 예정되어 있습니다."],
  [24, "H", "$98.26M (9.41% of Float) Unlock", "bad", "H 약 9,826만 달러(유통량의 9.41%) 물량이 언락됩니다."],
  [24, "BERA", "Fusaka Integration on BERA", "good", "베라체인에 Fusaka 통합이 적용됩니다."],
  [25, "US", "PCE", "important", "미국 개인소비지출(PCE) 물가지수 발표."],
  [26, "SAHARA", "$33.19M (30.10% of Float) Unlock", "bad", "SAHARA 약 3,319만 달러(유통량의 30.10%) 물량이 언락됩니다."],
  [26, "BTC", "60M call on Bitcoin (For now)", "neutral", "비트코인 6,000만 달러 콜 관련 이벤트입니다."],
  [27, "LUNC", "'Juris' Lending Platform Launch", "good", "LUNC 'Juris' 렌딩 플랫폼이 출시됩니다."],
  [29, "OXT", "Delisted by Upbit", "bad", "OXT가 업비트에서 상장폐지됩니다."],
  [30, "US", "JOLTS", "important", "미국 JOLTS 구인 보고서 발표."],
  [30, "STRC", "Payout day", "good", "STRC 배당 지급일입니다."],
  [30, "VIC", "Prometheus network upgrade", "good", "VIC 프로메테우스 네트워크 업그레이드가 진행됩니다."],
];

const TBA_EVENTS: [ticker: string, title: string, category: string, description: string][] = [
  ["USA", "Clarity Bill Senate vote", "important", "미국 상원 Clarity 법안 표결이 6월 중 예정되어 있습니다."],
  ["NOCK", "AI Inference Market Launch", "neutral", "NOCK AI 추론 마켓이 6월 중 출시됩니다."],
  ["OKX", "Prediction Market for WorldCup", "neutral", "OKX 월드컵 예측 시장이 6월 중 오픈합니다."],
  ["EU", "EU may start membership negotiations with Ukraine", "neutral", "EU-우크라이나 가입 협상이 6월 중 시작될 수 있습니다."],
  ["CC", "Mainnet v3.5", "neutral", "CC 메인넷 v3.5가 6월 중 출시됩니다."],
  ["NEAR", "Dynamic resharding & post-quantum-safe signing", "neutral", "NEAR 동적 리샤딩 및 양자내성 서명이 6월 중 적용됩니다."],
];

async function main() {
  await prisma.board.upsert({
    where: { slug: "analysis" },
    update: {},
    create: { slug: "analysis", name: "시장 분석", sortOrder: 2 },
  });

  await prisma.calendarEvent.deleteMany();
  await prisma.calendarEvent.createMany({
    data: [
      ...EVENTS.map(([day, ticker, title, category, description]) => ({
        date: new Date(Date.UTC(2026, 5, day)),
        ticker,
        title,
        category,
        description,
        sourceUrl: SOURCE,
      })),
      ...TBA_EVENTS.map(([ticker, title, category, description]) => ({
        date: new Date(Date.UTC(2026, 5, 1)),
        isTba: true,
        ticker,
        title,
        category,
        description,
        sourceUrl: SOURCE,
      })),
    ],
  });
  const count = await prisma.calendarEvent.count();
  console.log(`Seeded ${count} calendar events + analysis board`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
