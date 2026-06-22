import { getTodayListings, type Exchange } from "@/lib/listings";

// HH:mm (KST)
function kstTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// M/D HH:mm (KST) — 상장 예정 시각용
function kstDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${kstTime(iso)}`;
}

// 거래소 브랜드 색 (뱃지)
const EX_COLOR: Record<Exchange, string> = {
  Binance: "#b07d00", // amber
  Bithumb: "#f37321", // bithumb orange
  Coinbase: "#1652f0", // coinbase blue
  Robinhood: "#069c1f", // robinhood green
};

const DAY_MS = 24 * 3600_000;

// 상장 예정 시각이 지금부터 24시간 내(직전 2시간 포함)면 임박 → 빨간 강조
function isImminent(scheduledAt: string | null, now: number): boolean {
  if (!scheduledAt) return false;
  const diff = new Date(scheduledAt).getTime() - now;
  return diff <= DAY_MS && diff >= -2 * 3600_000;
}

// 금일 신규 상장 예정 피드 — @NewListingsFeed 채널 기반, 캘린더 상단 노출
export default async function ListingsStrip() {
  const { listings } = await getTodayListings();
  const now = Date.now();

  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between bg-navy-900 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-white">오늘 신규 상장 예정</h2>
          <span className="text-xs text-navy-100">{listings.length}건 · 상장 예정(KST)</span>
        </div>
      </header>

      {listings.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-500">
          오늘 신규 상장 예정 소식이 아직 없습니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-x-3 gap-y-2 px-4 py-3">
          {listings.map((l) => {
            const imminent = isImminent(l.scheduledAt, now);
            const exColor = EX_COLOR[l.exchange];
            const body = (
              <>
                <span
                  className="shrink-0 rounded-sm border px-1 text-[10px] font-semibold"
                  style={{ color: exColor, borderColor: exColor }}
                >
                  {l.exchange}
                </span>
                {l.symbol && (
                  <span
                    className={`px-1 font-mono text-[11px] font-semibold ${
                      imminent ? "bg-red-50 text-red-600" : "bg-paper2 text-navy-700"
                    }`}
                  >
                    ${l.symbol}
                  </span>
                )}
                <span className={`truncate ${imminent ? "text-red-700" : "text-ink-700"}`}>
                  {l.detail}
                </span>
                {l.scheduledAt ? (
                  <span
                    className={`shrink-0 font-mono text-[10px] font-semibold ${
                      imminent ? "text-red-600" : "text-navy-700"
                    }`}
                    title={`상장 예정 (한국시간) · 게시 ${kstTime(l.date)} KST`}
                  >
                    {kstDateTime(l.scheduledAt)} KST
                  </span>
                ) : (
                  <span
                    className="shrink-0 font-mono text-[10px] text-ink-400"
                    title={`상장 시각 미확인 · 게시 ${kstTime(l.date)} KST`}
                  >
                    미정
                  </span>
                )}
              </>
            );
            const tileCls = `flex items-center gap-1.5 border px-2 py-1 text-xs ${
              imminent
                ? "border-red-500 bg-red-50"
                : "border-line bg-paper hover:border-navy-300"
            }`;
            return (
              <li key={l.id} className="max-w-full">
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={tileCls}>
                    {body}
                  </a>
                ) : (
                  <span className={tileCls}>{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
