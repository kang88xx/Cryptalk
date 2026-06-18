import { getMarketBar } from "@/lib/marketbar";
import { formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import LiveViewers from "@/components/LiveViewers";
import LangToggle from "@/components/LangToggle";

// 등락 색: 한국식 (상승=빨강, 하락=파랑)
function dir(n: number | null): { text: string; stroke: string } {
  if (n != null && n > 0) return { text: "text-red-600", stroke: "#DC2626" };
  if (n != null && n < 0) return { text: "text-indigo-700", stroke: "#4853C4" };
  return { text: "text-ink-500", stroke: "#A0A6BB" };
}

// CoinMarketCal 스타일 상단 마켓바 — 미니차트 타일 (S&P 제외)
export default async function MarketBar() {
  const { tiles } = await getMarketBar();

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-stretch gap-3 px-4">
        {/* 타일 스트립 (가로 스크롤) */}
        <div className="flex flex-1 items-stretch gap-2 overflow-x-auto py-1.5">
          {tiles.length === 0 ? (
            <span className="rail self-center">마켓 데이터 불러오는 중…</span>
          ) : (
            tiles.map((t) => {
              const c = dir(t.changePct);
              return (
                <div
                  key={t.key}
                  className="flex shrink-0 items-center gap-2 border border-line bg-white px-2.5 py-1"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] whitespace-nowrap text-navy-400">{t.label}</span>
                    <span className="flex items-baseline gap-1">
                      <span className="font-mono text-[12px] font-semibold whitespace-nowrap text-navy-900">
                        {t.value}
                      </span>
                      {t.changePct != null && (
                        <span className={`font-mono text-[10px] ${c.text}`}>
                          {formatPercent(t.changePct)}
                        </span>
                      )}
                    </span>
                  </div>
                  {t.spark.length >= 2 && (
                    <Sparkline values={t.spark} width={48} height={22} stroke={c.stroke} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 우측 — 동시접속 · 언어 (스크롤 영향 없음) */}
        <div className="flex shrink-0 items-center gap-3 border-l border-line pl-3">
          <LiveViewers />
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
