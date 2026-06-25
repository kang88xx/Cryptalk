import { getMarketBar } from "@/lib/marketbar";
import { formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import LiveSparkline from "@/components/LiveSparkline";
import MarketStatus, { type Mkt } from "@/components/MarketStatus";

// 등락 색: 한국식 (상승=빨강, 하락=파랑)
function dir(n: number | null): { text: string; stroke: string } {
  if (n != null && n > 0) return { text: "text-up", stroke: "#e5443b" }; // 상승 — 레드
  if (n != null && n < 0) return { text: "text-down", stroke: "#2e7ce6" }; // 하락 — 블루
  return { text: "text-neutral", stroke: "#7d858f" };
}

// 타일 키 → 시장 구분 (장중/장마감 판별용)
function marketOf(key: string): Mkt | null {
  if (key === "nasdaq") return "us";
  if (key === "kospi" || key === "kosdaq") return "kr";
  if (key === "gold") return "gold";
  return null;
}

// 상단 마켓바 — 지수·원자재 미니차트 타일 (나스닥·코스피·코스닥·금)
export default async function MarketBar() {
  const { tiles } = await getMarketBar();

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-stretch gap-3 px-4">
        {/* 타일 스트립 — 스크롤 없이 줄바꿈 (공간 부족 시 2줄) */}
        <div className="flex flex-1 flex-wrap items-stretch gap-2 py-2">
          {tiles.length === 0 ? (
            <span className="rail self-center">마켓 데이터 불러오는 중…</span>
          ) : (
            tiles.map((t) => {
              const c = dir(t.changePct);
              const mkt = marketOf(t.key);
              return (
                <div
                  key={t.key}
                  className="flex shrink-0 grow flex-col justify-center gap-1 border border-line bg-white px-3 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex flex-col leading-tight">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>
                        {mkt && <MarketStatus market={mkt} />}
                      </span>
                      <span className="flex items-baseline gap-1">
                        <span className="font-mono text-[14px] font-semibold whitespace-nowrap text-navy-900">
                          {t.value}
                        </span>
                        {t.changePct != null && (
                          <span className={`font-mono text-[11px] ${c.text}`}>
                            {formatPercent(t.changePct)}
                          </span>
                        )}
                      </span>
                    </div>
                    {t.spark.length >= 2 &&
                      (mkt ? (
                        <LiveSparkline market={mkt} values={t.spark} width={56} height={26} stroke={c.stroke} />
                      ) : (
                        <Sparkline values={t.spark} width={56} height={26} stroke={c.stroke} />
                      ))}
                  </div>

                  {/* 대표 종목 2개 — 한 칸을 좌우 반으로 나눠 표시 (나스닥·코스피) */}
                  {t.stocks && t.stocks.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-line pt-1">
                      {t.stocks.map((s, i) => {
                        const sc = dir(s.changePct);
                        return (
                          <span
                            key={i}
                            className={`flex min-w-0 flex-1 items-baseline gap-1 ${
                              i === 1 ? "justify-end" : ""
                            }`}
                          >
                            <span className="truncate text-[9px] text-navy-400">{s.label}</span>
                            <span className="font-mono text-[10px] whitespace-nowrap text-navy-900">
                              {s.value}
                            </span>
                            {s.changePct != null && (
                              <span className={`font-mono text-[9px] whitespace-nowrap ${sc.text}`}>
                                {formatPercent(s.changePct)}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
