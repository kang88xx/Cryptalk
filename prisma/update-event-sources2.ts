import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 2차 출처 검증 결과 적용 (리서치 에이전트 4개 조사, 검증일 2026-06-11)
type Update = {
  ticker: string;
  titleStartsWith: string;
  sourceUrl: string;
  description?: string;
  newDay?: number;
  newTitle?: string;
  clearTba?: boolean;
};

const UPDATES: Update[] = [
  // ─── 언락 · 상폐 ───
  { ticker: "SUI", titleStartsWith: "$15.15M", sourceUrl: "https://www.panewslab.com/en/articles/019e7ddc-8496-75a4-b111-01f8cc08f64a", newDay: 1, newTitle: "~$13.1M Monthly Unlock", description: "SUI 월간 언락 — 6/1 약 1,436만 SUI(유통량의 약 0.36%, 약 1,310만 달러)가 풀립니다." },
  { ticker: "HYPE", titleStartsWith: "534k", sourceUrl: "https://cryptodaily.co.uk/2026/06/hype-june-6-unlock-absorb-supply", description: "6/6 코어 기여자 베스팅 언락. 일정상 전체는 약 992만 HYPE(~$675M)이지만 팀은 약 53만 HYPE(~$38M, 유통량의 0.24%)만 클레임한다고 발표했습니다." },
  { ticker: "MEGA", titleStartsWith: "$15.84M", sourceUrl: "https://tokenomist.ai/megaeth/unlock-events", newTitle: "~$10.6M (2.5% of Supply) Unlock", description: "6/23 메인넷 캠페인(Terminal) 물량 2.5억 MEGA(총 공급량의 2.5%, 약 $10.6M)가 언락됩니다." },
  { ticker: "H", titleStartsWith: "$98.26M", sourceUrl: "https://tokenomist.ai/humanity", newDay: 25, newTitle: "~$45M Investor Unlock", description: "휴머니티 프로토콜(H) 투자자 언락 클리프 — 6/25 약 2.66억 H(총 공급량의 2.7%, 약 $45M)가 배포됩니다." },
  { ticker: "SAHARA", titleStartsWith: "$33.19M", sourceUrl: "https://cryptorank.io/price/sahara/vesting", description: "6/26 12:00 UTC 약 10.3억 SAHARA(총 공급량의 약 10%, 유통량의 약 30%) 언락 — 투자자·팀 물량 중심의 대형 언락입니다." },
  { ticker: "NKN", titleStartsWith: "Delisted by Upbit", sourceUrl: "https://www.mexc.com/news/1088251", description: "업비트가 6/15 15:00(KST) NKN 거래지원을 종료합니다. 사업성·개발 진척 부족이 사유이며 이후 일정 기간 출금만 지원됩니다." },
  { ticker: "VVV", titleStartsWith: "Emission Reduction", sourceUrl: "https://x.com/AskVenice/status/2037231269449523276", description: "Venice 공식 발표 — 6/1부터 VVV 연간 발행량이 500만 개에서 400만 개로 감축됩니다(단계적 감축의 일부)." },
  // ─── 프로젝트 소식 ───
  { ticker: "ARX", titleStartsWith: "Arcium TGE", sourceUrl: "https://www.kucoin.com/news/flash/june-2026-crypto-events-include-strato-defi-app-tea-tges-and-upgrades", description: "아르시움(ARX) TGE — 6월 중 진행으로 보도됐으나 정확한 날짜는 공식 확정 전입니다." },
  { ticker: "TEA", titleStartsWith: "$TEA TGE", sourceUrl: "https://cryptobriefing.com/tea-protocol-token-transparency-filing-tea-launch/", description: "Tea Protocol TEA 토큰이 6/4 00:00 UTC Aerodrome Ignition으로 TGE — 총 공급 1,000억 개, 초기 유통 20%." },
  { ticker: "HOME", titleStartsWith: "Perps Open", sourceUrl: "https://www.kucoin.com/news/flash/june-2026-crypto-events-include-strato-defi-app-tea-tges-and-upgrades", description: "DeFi App(HOME)이 6/4 Rocket Perps 무기한 거래를 오픈 — DIP-004에 따라 프로토콜 수익의 80%가 HOME 바이백에 사용됩니다." },
  { ticker: "SEI", titleStartsWith: "Joint Whitepaper with MasterCard", sourceUrl: "https://www.hokanews.com/2026/05/sei-joins-mastercard-crypto-partner.html", description: "Sei가 마스터카드 크립토 파트너 프로그램에 합류, 공동 프레임워크 문서 발간 예고 — 단, 6/2 공동 백서 발표 자체는 공식 확인 전입니다." },
  { ticker: "PENGU", titleStartsWith: "Pudgy Penguins x MetaMask", sourceUrl: "https://x.com/pudgypenguins/status/2052042673515536848", description: "MetaMask x 퍼지펭귄 소울바운드 토큰(SBT) 시리즈 — 오픈 에디션은 6/3까지 모든 MetaMask 지갑에서 클레임 가능." },
  { ticker: "MNT", titleStartsWith: "Hackathon Phase 2 Winner", sourceUrl: "https://chainwire.org/2026/04/23/mantle-launches-turing-test-hackathon-2026-backed-by-tencent-cloud-bybit-byreal-and-bga/", description: "맨틀 '튜링 테스트' 해커톤 2단계(AI Awakening, 상금 $10만) 진행 중 — 우승자 발표는 7/10로 알려져 6/10 발표 여부는 불확실합니다." },
  { ticker: "RUNE", titleStartsWith: "(~6/13) Mainnet v3.19", sourceUrl: "https://announcements.bybit.com/en/article/bybit-to-support-thorchain-rune-v3-19-0-network-upgrade-blt844955a3efe0436c/", description: "THORChain v3.19.0 업그레이드 — 5월 해킹($10.7M) 복구를 위한 TSS 보안 패치 및 손상 볼트 격리 메커니즘 도입." },
  { ticker: "BERA", titleStartsWith: "Fusaka Integration", sourceUrl: "https://www.tradingview.com/news/coinmarketcal:cb4e2a6b8094b:0-berachain-bera-fusaka-mainnet-upgrade-24-june-2026/", description: "베라체인 6/24 Fusaka 메인넷 하드포크(BRIP-0010) — PoL 변경은 하루 전인 6/23 활성화." },
  { ticker: "LUNC", titleStartsWith: "'Juris' Lending Platform Launch", sourceUrl: "https://x.com/CosmosEcosystem/status/2058220984822583728", description: "테라 클래식 기반 렌딩 플랫폼 Juris Protocol이 6/27 클로즈드 알파 출시 — SolidProof 감사 완료." },
  { ticker: "VIC", titleStartsWith: "Prometheus network upgrade", sourceUrl: "https://blog.viction.xyz/viction-network-upgrade-ready-for-victions-future-initiatives/", description: "빅션(Viction) 네트워크 업그레이드 로드맵은 공식 확인됨 — 단 'Prometheus' 명칭의 6/30 일정은 공식 채널에서 확정 전입니다." },
  { ticker: "STRC", titleStartsWith: "Semi-Monthly STRC Dividends", sourceUrl: "https://www.strategy.com/press/strategy-announces-approval-of-strc-semi-monthly-dividends_06-08-2026", description: "6/8 Strategy 주주총회에서 STRC 배당의 반월(월 2회) 전환 승인 — 연 11.50% 배당률 유지." },
  { ticker: "STRC", titleStartsWith: "Payout day", sourceUrl: "https://www.strategy.com/press/strategy-announces-approval-of-strc-semi-monthly-dividends_06-08-2026", description: "6/30 STRC 마지막 월간 배당 지급일이자 첫 반월 배당 기준일 — 첫 반월 지급은 7/15." },
  { ticker: "BTC", titleStartsWith: "60M call on Bitcoin", sourceUrl: "https://news.bitcoin.com/bitcoin-futures-hit-42-6b-across-11-exchanges-here-is-what-open-interest-signals-for-june/", description: "6/26은 데리비트 기준 약 85억 달러 규모 비트코인 분기 옵션 만기일(맥스페인 ~$77,500) — '60M 콜' 자체는 별도 확인되지 않았습니다." },
  { ticker: "MEGA", titleStartsWith: "Season 1 Sunset", sourceUrl: "https://blockchainreporter.net/megaeth-mega-airdrop-farming-guide-season-1-is-live-here-is-how-to-play-it/", newDay: 10, description: "MegaETH 시즌1 — 포인트 프로그램은 5/21 조기 종료됐고, 보상(USDm) 클레임 마감이 6/10입니다." },
  { ticker: "BELIEVE", titleStartsWith: "Ben Pasternak in court", sourceUrl: "https://en.wikipedia.org/wiki/Ben_Pasternak", description: "Believe 창업자 벤 파스터낙의 뉴욕 형사법원 심리(6/11) — 별도로 토큰 희석 관련 집단소송도 진행 중." },
  // ─── 주식 · 매크로 ───
  { ticker: "BNB", titleStartsWith: "Binance New Product", sourceUrl: "https://www.prnewswire.com/news-releases/binance-launches-us-stocks-trading-and-previews-bstocks-tokenized-securities-302787226.html", description: "바이낸스가 6/1 미국 주식·ETF 거래 서비스를 공개하고 토큰화 증권 'bStocks' 출시 계획을 발표했습니다." },
  { ticker: "NVDA", titleStartsWith: "Announcement", sourceUrl: "https://blogs.nvidia.com/blog/nvidia-gtc-taipei-computex-2026-news/", description: "젠슨 황 CEO가 6/1 Computex 2026(GTC Taipei) 기조연설에서 RTX Spark 등 신제품을 발표했습니다." },
  { ticker: "NVDA", titleStartsWith: "(1~5) Computex", sourceUrl: "https://www.nvidia.com/en-tw/gtc/taipei/computex/", description: "Computex 2026은 6/1~5 타이베이에서 개최, 엔비디아 GTC Taipei는 6/1~4 동시 진행." },
  { ticker: "AAPL", titleStartsWith: "Special Event at Apple Park", sourceUrl: "https://developer.apple.com/wwdc26/special-event/", description: "WWDC26 첫날(6/8) 애플파크 스페셜 이벤트 — iOS 27, 새로운 Siri AI 등 공개." },
  { ticker: "AVGO", titleStartsWith: "Earnings Call", sourceUrl: "https://www.sec.gov/Archives/edgar/data/0001730168/000173016826000051/avgo-05032026x8kxex99.htm", description: "브로드컴 FY2026 2분기 실적 발표(6/3) — 매출 221.9억 달러, 전년 대비 +48%." },
  { ticker: "ORCL", titleStartsWith: "Earnings Call", sourceUrl: "https://investor.oracle.com/investor-news/news-details/2026/Oracle-Sets-the-Date-for-its-Fourth-Quarter-Fiscal-Year-2026-Earnings-Announcement/default.aspx", description: "오라클 FY2026 4분기 실적 발표(6/10 장 마감 후) — 분기 매출 192억 달러로 사상 최대." },
  { ticker: "MU", titleStartsWith: "Earnings Call", sourceUrl: "https://www.globenewswire.com/news-release/2026/05/27/3302360/14450/en/micron-technology-to-report-fiscal-third-quarter-results-on-june-24-2026.html", description: "마이크론 FY2026 3분기 실적 컨퍼런스콜(6/24, 현지시간)." },
  { ticker: "MSCI", titleStartsWith: "Results of the Global Market", sourceUrl: "https://www.msci.com/downloads/documents/press-releases/media-room/PR_MSCI_2026_Annual_Market_Classification_Review_Announcement_Date.pdf", description: "MSCI 2026 글로벌 시장 접근성 평가 결과 발표(6/18) — MSCI 공식 일정." },
  { ticker: "MSCI", titleStartsWith: "Annual Market Classification", sourceUrl: "https://www.msci.com/downloads/documents/press-releases/media-room/PR_MSCI_2026_Annual_Market_Classification_Review_Announcement_Date.pdf", description: "MSCI 2026 연례 시장 분류 평가 결과 발표(6/23) — MSCI 공식 일정." },
  { ticker: "COIN", titleStartsWith: "CFTC-regulated", sourceUrl: "https://www.coinbase.com/blog/coming-june-8-perpetual-style-equity-index-futures", description: "코인베이스가 6/8 CFTC 규제 거래소에서 미국 최초 퍼페추얼 방식 주가지수 선물(AI10·China10·Defense10·Tech100)을 출시했습니다." },
  { ticker: "CME", titleStartsWith: "Nasdaq CME Crypto index futures", sourceUrl: "https://www.cmegroup.com/media-room/press-releases/2026/5/14/cme_group_to_launchnasdaqcmecryptoindexfutures.html", description: "CME그룹이 6/8 나스닥 CME 크립토 지수 선물 출시 — BTC·ETH·SOL·XRP 등 시총 가중 지수 기반." },
  { ticker: "ETH", titleStartsWith: "(6/8~6/10) ETH Conf", sourceUrl: "https://ethconf.com/", description: "ETHGlobal 주최 ETHConf(6/8~10, 뉴욕 재비츠 센터) — 이더리움과 기관 금융의 융합을 다루는 컨퍼런스." },
  { ticker: "US", titleStartsWith: "US Spectrum Auction", sourceUrl: "https://www.fcc.gov/document/fcc-kicks-first-spectrum-auction-four-years", description: "FCC가 6/2 4년 만의 첫 주파수 경매(AWS-3, Auction 113) 입찰을 개시했습니다." },
  { ticker: "US", titleStartsWith: "Rubio to Testify", sourceUrl: "https://thehill.com/video-clips/5905235-watch-live-marco-rubio-senate-hearing-state-budget-iran-war/", description: "루비오 국무장관이 6/2 상원 외교위에서 FY27 국무부 예산·이란 전쟁 관련 증언을 했습니다." },
  { ticker: "IRAN", titleStartsWith: "Next US-Iran Meeting", sourceUrl: "https://www.aljazeera.com/news/2026/6/5/are-us-and-iran-closer-to-war-or-to-a-deal", description: "이란이 6/1 협상 중단을 발표해 6/5 미국-이란 회담은 무산 — 추가 회담 일정은 미정 (지정학 리스크 지속)." },
  { ticker: "OPEC", titleStartsWith: "OPEC+ Ministerial Meeting", sourceUrl: "https://www.opec.org/pr-detail/602-3-may-2026.html", description: "제41차 OPEC+ 장관급 회의(6/7) — UAE 탈퇴 이후 첫 회의로 산유량 쿼터 결정이 핵심 의제." },
  // ─── TBA → 확정 포함 ───
  { ticker: "USA", titleStartsWith: "Clarity Bill Senate vote", sourceUrl: "https://www.coindesk.com/news-analysis/2026/06/02/clarity-act-survival-depends-on-the-u-s-senate-getting-a-lot-of-non-crypto-work-done", description: "CLARITY 법안 — 5월 상원 은행위 통과(15-9) 후 본회의 일정 대기 중. 60표 확보와 의사일정 문제로 6월 내 표결은 불확실." },
  { ticker: "NOCK", titleStartsWith: "AI Inference Market Launch", sourceUrl: "https://www.nockchain.org/roadmap", description: "Nockchain 공식 로드맵에 'AI Compute Market Launch'가 2026년 6월로 명시 — AI 추론 사업자의 병합채굴 마켓." },
  { ticker: "OKX", titleStartsWith: "Prediction Market for WorldCup", sourceUrl: "https://www.odaily.news/en/post/5211148", newDay: 3, clearTba: true, description: "OKX 월드컵 온체인 예측 이벤트 — 6/3부터 결승(7/19)까지 우승팀·골든부트·전 경기 예측, 총 16.66 BTC 상금 풀." },
  { ticker: "EU", titleStartsWith: "EU may start membership negotiations", sourceUrl: "https://www.pravda.com.ua/eng/news/2026/06/04/8037703/", newDay: 15, clearTba: true, description: "우크라이나·몰도바 EU 가입 협상 첫 클러스터(법치·인권·거버넌스)가 6/15 룩셈부르크 정부간회의에서 공식 개시 예정." },
  { ticker: "CC", titleStartsWith: "Mainnet v3.5", sourceUrl: "https://github.com/digital-asset/canton/releases", description: "Canton Network 프로토콜 3.5 — 무중단 업그레이드(LSU) 도입, 6월 중 메인넷 전환 진행 단계 (6/3 v3.5.3 릴리스)." },
  { ticker: "NEAR", titleStartsWith: "Dynamic resharding", sourceUrl: "https://www.coindesk.com/markets/2026/05/22/near-protocol-to-automate-its-own-growth-and-its-token-is-skyrocketing", description: "NEAR 6월 업그레이드 — 수요 기반 동적 리샤딩 + 포스트퀀텀(FIPS-204) 서명 도입 예정." },
];

async function main() {
  let updated = 0;
  const misses: string[] = [];
  for (const u of UPDATES) {
    const events = await prisma.calendarEvent.findMany({
      where: { ticker: u.ticker, title: { startsWith: u.titleStartsWith } },
    });
    if (events.length === 0) {
      misses.push(`${u.ticker} ${u.titleStartsWith}`);
      continue;
    }
    for (const ev of events) {
      await prisma.calendarEvent.update({
        where: { id: ev.id },
        data: {
          sourceUrl: u.sourceUrl,
          ...(u.description ? { description: u.description } : {}),
          ...(u.newTitle ? { title: u.newTitle } : {}),
          ...(u.clearTba ? { isTba: false } : {}),
          ...(u.newDay != null
            ? { date: new Date(Date.UTC(ev.date.getUTCFullYear(), ev.date.getUTCMonth(), u.newDay)) }
            : {}),
        },
      });
      updated++;
    }
  }
  const remaining = await prisma.calendarEvent.findMany({
    where: { sourceUrl: { contains: "x.com/layerggofficial" } },
    select: { ticker: true, title: true },
  });
  console.log(`업데이트 ${updated}건`);
  if (misses.length) console.log("매칭 실패:", misses.join(" | "));
  console.log(`LAYER.GG 출처 잔여 ${remaining.length}건:`, remaining.map((r) => `${r.ticker} ${r.title}`).join(" | "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
