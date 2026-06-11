// 푸터 위 — 취급 토큰/프로젝트 로고 스트립 (한 줄 10개)
const TOKENS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "TRX", name: "Tron" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "NEAR", name: "NEAR" },
];

export default function LogoStrip() {
  return (
    <div className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-4 py-4">
        {TOKENS.map((t) => (
          <span
            key={t.symbol}
            className="flex items-center gap-1.5 opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
            title={t.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://assets.coincap.io/assets/icons/${t.symbol.toLowerCase()}@2x.png`}
              width={16}
              height={16}
              alt={t.name}
              className="rounded-full"
            />
            <span className="text-[10px] font-medium tracking-wide text-navy-500">
              {t.symbol}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
