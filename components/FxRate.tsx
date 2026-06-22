import { getTickers } from "@/lib/ticker";
import { getFxHistory } from "@/lib/market";

// 환율(USD/KRW) 독립 섹션 — 현재 환율 + 최근 6영업일 등락 색 농도 히트맵
export default async function FxRate() {
  const [snapshot, fxHistory] = await Promise.all([getTickers(), getFxHistory()]);

  const fxIsEstimate = snapshot.usdKrwSource === "fallback";
  const fxLabel = fxIsEstimate ? "고정환율 추정" : "ECB 기준";

  // 전 영업일 대비 등락 — 색 농도용 (표시는 최근 6일)
  const fxDisplay = fxHistory.slice(-6);
  const fxChangeAt = (i: number): number | null => {
    const idx = fxHistory.length - fxDisplay.length + i;
    const prev = fxHistory[idx - 1];
    const cur = fxHistory[idx];
    return prev && cur ? (cur.rate / prev.rate - 1) * 100 : null;
  };
  const fxMaxAbs = Math.max(0.05, ...fxDisplay.map((_, i) => Math.abs(fxChangeAt(i) ?? 0)));
  const latestChange = fxDisplay.length ? fxChangeAt(fxDisplay.length - 1) : null;

  return (
    <section className="border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-navy-900">환율 USD/KRW</h2>
          <span className="font-mono text-2xl font-light tracking-tight tabular-nums text-navy-900">
            {snapshot.usdKrw.toLocaleString()}
          </span>
          {latestChange != null && (
            <span
              className={`font-mono text-[13px] tabular-nums ${
                latestChange >= 0 ? "text-red-600" : "text-indigo-700"
              }`}
            >
              {latestChange >= 0 ? "+" : ""}
              {latestChange.toFixed(2)}%
            </span>
          )}
        </div>
        <span
          className={`font-mono text-[10px] tracking-[0.12em] uppercase ${
            fxIsEstimate ? "font-semibold text-red-600" : "text-navy-300"
          }`}
        >
          {fxIsEstimate ? "⚠ 환율 일시 추정 · 김프 정확도 주의" : `${fxLabel} · 최근 6영업일`}
        </span>
      </div>

      {/* 최근 6영업일 — 전일 대비 등락을 색 농도로 (상승 빨강 · 하락 파랑) */}
      <div className="grid grid-cols-6 gap-1.5">
        {fxDisplay.map((p, i) => {
          const d = new Date(p.date + "T00:00:00Z");
          const ch = fxChangeAt(i);
          const alpha = ch == null ? 0 : 0.1 + Math.min(1, Math.abs(ch) / fxMaxAbs) * 0.65;
          const bg =
            ch == null || alpha === 0
              ? "var(--color-paper)"
              : ch >= 0
                ? `rgba(220,38,38,${alpha.toFixed(2)})`
                : `rgba(72,83,196,${alpha.toFixed(2)})`;
          return (
            <div
              key={p.date}
              className="border border-line px-1 py-2 text-center"
              style={{ background: bg }}
              title={ch == null ? undefined : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
            >
              <p className="font-mono text-[10px] text-navy-300">
                {d.getUTCMonth() + 1}/{d.getUTCDate()}
              </p>
              <p className="mt-0.5 font-mono text-[14px] tabular-nums text-navy-900">
                {Math.round(p.rate).toLocaleString()}
              </p>
              <p
                className={`font-mono text-[9px] tabular-nums ${
                  ch == null ? "text-ink-500" : ch >= 0 ? "text-red-600" : "text-indigo-700"
                }`}
              >
                {ch == null ? "·" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
