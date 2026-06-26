import { getMarketBar, type BarTile } from "@/lib/marketbar";
import { formatPercent } from "@/lib/format";
import Sparkline from "@/components/Sparkline";
import LiveSparkline from "@/components/LiveSparkline";
import MarketStatus, { type Mkt } from "@/components/MarketStatus";

// 모든 타일은 동일한 고정 크기 — 272×72 (px). 내용은 세로 중앙·넘침 숨김으로 맞춤.
const TILE = "h-[72px] w-[272px] shrink-0 overflow-hidden";

// 등락 색: 한국식 (상승=빨강, 하락=파랑)
function dir(n: number | null): { text: string; stroke: string } {
  if (n != null && n > 0) return { text: "text-up", stroke: "#e5443b" }; // 상승 — 레드
  if (n != null && n < 0) return { text: "text-down", stroke: "#2e7ce6" }; // 하락 — 블루
  return { text: "text-neutral", stroke: "#7d858f" };
}

// 타일 키 → 시장 구분 (장중/장마감 판별용). 2행 타일은 tile.market을 우선 사용.
function marketOf(t: BarTile): Mkt | null {
  if (t.market) return t.market;
  if (t.key === "nasdaq") return "us";
  if (t.key === "kospi" || t.key === "kosdaq") return "kr";
  if (t.key === "gold") return "gold";
  return null;
}

// 공포·탐욕 지수 색 — 공포=레드, 중립=그레이, 탐욕=그린 (alternative.me 게이지 관례)
function fngColor(v: number): string {
  if (v < 25) return "#e5443b"; // 극단적 공포
  if (v < 45) return "#f5871f"; // 공포
  if (v < 55) return "#7d858f"; // 중립
  if (v < 75) return "#3aa76d"; // 탐욕
  return "#1e9e5a"; // 극단적 탐욕
}

// 공포·탐욕 지수 타일 — 현재값 + 0~100 게이지 + 최근 6일
function FngTile({ t }: { t: BarTile }) {
  const f = t.fng!;
  const color = fngColor(f.value);
  const pos = Math.min(100, Math.max(0, f.value));
  return (
    <div className={`${TILE} flex flex-col justify-center gap-0.5 border border-line bg-white px-3 py-1`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>
        <span className="text-[9px] tracking-wider text-navy-300">DAILY</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[18px] font-bold leading-none" style={{ color }}>
          {f.value}
        </span>
        <span className="text-[11px] font-medium" style={{ color }}>
          {f.label}
        </span>
      </div>
      {/* 0~100 그라데이션 게이지 + 현재 위치 마커 */}
      <div
        className="relative h-1.5 w-full rounded-full"
        style={{ background: "linear-gradient(90deg,#e5443b,#f5871f,#d9dde2,#3aa76d,#1e9e5a)" }}
      >
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy-900 shadow"
          style={{ left: `${pos}%` }}
        />
      </div>
      {/* 최근 6일 */}
      {f.history.length > 0 && (
        <div className="flex items-stretch justify-between gap-0.5 border-t border-line pt-1">
          {f.history.map((d) => (
            <span key={d.date} className="flex min-w-0 flex-1 flex-col items-center leading-tight">
              <span className="text-[8px] text-navy-300">{d.date}</span>
              <span className="font-mono text-[10px]" style={{ color: fngColor(d.value) }}>
                {d.value}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// USDT 압축 타일 — 도미넌스(값+환율 미니차트) + 테더·환율 2줄
function UsdtTile({ t }: { t: BarTile }) {
  const u = t.usdt!;
  const fxStroke = dir(u.fxChangePct).stroke;
  return (
    <div className={`${TILE} flex flex-col justify-center gap-0.5 border border-line bg-white px-3 py-1`}>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>
          <span className="font-mono text-[14px] font-semibold whitespace-nowrap text-navy-900">
            {t.value}
          </span>
        </div>
        {u.fxSpark.length >= 2 && (
          <Sparkline values={u.fxSpark} width={56} height={26} stroke={fxStroke} />
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-line pt-1 text-[9px] leading-tight">
        <span className="flex items-baseline justify-between gap-1">
          <span className="whitespace-nowrap text-navy-400">
            테더{" "}
            <span className="font-mono text-navy-900">
              {u.tetherKrw != null ? `${Math.round(u.tetherKrw).toLocaleString("ko-KR")}원` : "-"}
            </span>
          </span>
          <span className={`font-mono whitespace-nowrap ${dir(u.tetherKimchi).text}`}>
            김프 {formatPercent(u.tetherKimchi)}
          </span>
        </span>
        <span className="flex items-baseline justify-between gap-1">
          <span className="whitespace-nowrap text-navy-400">
            환율{" "}
            <span className="font-mono text-navy-900">
              {u.usdKrw != null ? u.usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "-"}
            </span>
          </span>
          <span className={`font-mono whitespace-nowrap ${dir(u.fxChangePct).text}`}>
            {formatPercent(u.fxChangePct)}
          </span>
        </span>
      </div>
    </div>
  );
}

// 환율 USD/KRW 타일 — 현재값(+변동) + 6일 추이
function FxTile({ t }: { t: BarTile }) {
  const f = t.fx!;
  const c = dir(t.changePct);
  return (
    <div className={`${TILE} flex flex-col justify-center gap-0.5 border border-line bg-white px-3 py-1`}>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>
        <span className="flex items-baseline gap-1">
          <span className="font-mono text-[14px] font-semibold whitespace-nowrap text-navy-900">
            {t.value}
          </span>
          {t.changePct != null && (
            <span className={`font-mono text-[11px] ${c.text}`}>{formatPercent(t.changePct)}</span>
          )}
        </span>
      </div>

      {/* 환율 USD/KRW 최근 6일 */}
      {f.fx6.length > 0 && (
        <div className="flex items-stretch justify-between gap-0.5 border-t border-line pt-1">
          {f.fx6.map((d, i) => (
            <span key={i} className="flex min-w-0 flex-1 flex-col items-center leading-tight">
              <span className="text-[8px] text-navy-300">{d.date}</span>
              <span className="font-mono text-[10px] whitespace-nowrap text-navy-900">
                {Math.round(d.rate).toLocaleString("ko-KR")}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 단일 타일 렌더 — 지수·코인·MSTR 공통
function Tile({ t }: { t: BarTile }) {
  // 공포·탐욕 지수 타일
  if (t.fng) return <FngTile t={t} />;
  // USDT 압축 카드 타일
  if (t.usdt) return <UsdtTile t={t} />;
  // 환율 USD/KRW 타일
  if (t.fx) return <FxTile t={t} />;

  // 자리표시자 — 라벨 있으면 상단 표시 + 보조문구(지표 찾는중 등), 없으면 가운데 "고민중…"
  if (t.placeholder) {
    return (
      <div className={`${TILE} flex flex-col justify-center border border-dashed border-line bg-white/60 px-3 py-1`}>
        {t.label && <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>}
        <span className="flex flex-1 items-center justify-center text-[11px] text-navy-300">
          {t.note ?? "고민중…"}
        </span>
      </div>
    );
  }

  const c = dir(t.changePct);
  const mkt = marketOf(t);
  return (
    <div className={`${TILE} flex flex-col justify-center gap-0.5 border border-line bg-white px-3 py-1`}>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] whitespace-nowrap text-navy-400">{t.label}</span>
            {mkt && <MarketStatus market={mkt} />}
          </span>
          <span className="flex items-baseline gap-1">
            <span
              className={`font-mono text-[14px] font-semibold whitespace-nowrap ${
                t.valueTone != null ? dir(t.valueTone).text : "text-navy-900"
              }`}
            >
              {t.value}
            </span>
            {t.changePct != null && (
              <span className={`font-mono text-[11px] ${c.text}`}>{formatPercent(t.changePct)}</span>
            )}
          </span>
          {t.sub && <span className="text-[9px] whitespace-nowrap text-navy-300">{t.sub}</span>}
        </div>
        {t.spark.length >= 2 &&
          (mkt ? (
            <LiveSparkline market={mkt} values={t.spark} width={56} height={26} stroke={c.stroke} />
          ) : (
            <Sparkline values={t.spark} width={56} height={26} stroke={c.stroke} />
          ))}
      </div>

      {/* 비율 채움 막대 — 도미넌스 등 (0~100%) */}
      {t.barPct != null && (
        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-navy-400"
            style={{ width: `${Math.min(100, Math.max(0, t.barPct))}%` }}
          />
        </div>
      )}

      {/* 6일 추세 — 도미넌스 (날짜 + 값%) */}
      {t.dom6 && t.dom6.length > 0 && (
        <div className="flex items-stretch justify-between gap-0.5 border-t border-line pt-1">
          {t.dom6.map((d, i) => (
            <span key={i} className="flex min-w-0 flex-1 flex-col items-center leading-tight">
              <span className="text-[8px] text-navy-300">{d.date}</span>
              <span className="font-mono text-[10px] whitespace-nowrap text-navy-900">
                {d.value.toFixed(1)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* 대표 종목 2개 — 한 칸을 좌우 반으로 나눠 표시 (나스닥·코스피) */}
      {t.stocks && t.stocks.length > 0 && (
        <div className="flex items-center gap-2 border-t border-line pt-1">
          {t.stocks.map((s, i) => {
            const sc = dir(s.changePct);
            return (
              <span
                key={i}
                className={`flex min-w-0 flex-1 items-baseline gap-1 ${i === 1 ? "justify-end" : ""}`}
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

      {/* MSTR 비트코인 트레저리 — 보유량(전날 대비) · 평단가 · 현재 수익률 */}
      {t.treasury && (
        <div className="flex flex-col gap-0.5 border-t border-line pt-1 text-[9px] leading-tight">
          <span className="flex items-baseline justify-between gap-1">
            <span className="text-navy-400">보유 BTC</span>
            <span className="font-mono whitespace-nowrap text-navy-900">
              {Math.round(t.treasury.holdings).toLocaleString()}
              {t.treasury.holdingsDelta !== 0 && (
                <span className={`ml-0.5 ${dir(t.treasury.holdingsDelta).text}`}>
                  {t.treasury.holdingsDelta > 0 ? "+" : ""}
                  {Math.round(t.treasury.holdingsDelta).toLocaleString()}
                </span>
              )}
            </span>
          </span>
          <span className="flex items-baseline justify-between gap-1">
            <span className="whitespace-nowrap text-navy-400">
              평단 ${Math.round(t.treasury.avgPriceUsd).toLocaleString()}
            </span>
            <span className={`font-mono whitespace-nowrap ${dir(t.treasury.returnPct).text}`}>
              {formatPercent(t.treasury.returnPct)}
            </span>
          </span>
        </div>
      )}

      {/* 비트코인 채굴 손익분기점 — 원가/가격 비율 + 채굴 손익 라벨 (원가>가격이면 손실) */}
      {t.mining && (
        <div className="flex items-baseline justify-between gap-1 border-t border-line pt-1 text-[9px] leading-tight">
          <span className="whitespace-nowrap text-navy-400">
            원가/가격{" "}
            <span className="font-mono text-navy-900">
              {t.mining.ratio != null ? t.mining.ratio.toFixed(2) : "-"}
            </span>
          </span>
          {t.mining.ratio != null && (
            <span
              className="font-medium whitespace-nowrap"
              style={{ color: t.mining.ratio > 1 ? "#e5443b" : "#1e9e5a" }}
            >
              {t.mining.ratio > 1 ? "채굴 손실" : "채굴 이익"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// 상단 마켓바 — 1행: 지수·금 / 2행: 코인·MSTR·공포탐욕 / 3행: 도미넌스 등
export default async function MarketBar() {
  const { tiles } = await getMarketBar();
  // 그룹별 행 (순서 고정) — 각 행은 고정 크기 타일을 균등 분배해 열이 정렬됨
  const rows = [
    tiles.filter((t) => t.group !== "crypto" && t.group !== "macro"), // index
    tiles.filter((t) => t.group === "crypto"),
    tiles.filter((t) => t.group === "macro"),
  ].filter((row) => row.length > 0);

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-stretch gap-3 px-4">
        <div className="flex flex-1 flex-col gap-2 py-2">
          {tiles.length === 0 ? (
            <span className="rail self-center">마켓 데이터 불러오는 중…</span>
          ) : (
            // 고정 크기(272×72) 타일을 행마다 균등 분배 — 모든 행의 열이 항상 정렬됨
            rows.map((row, i) => (
              <div key={i} className="flex flex-wrap justify-between gap-y-2">
                {row.map((t) => (
                  <Tile key={t.key} t={t} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
