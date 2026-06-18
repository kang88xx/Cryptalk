import { getTodayListings } from "@/lib/listings";

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

// 금일 바이낸스 선물 신규 상장 피드 — @NewListingsFeed 채널 기반, 캘린더 상단 노출
export default async function ListingsStrip() {
  const { listings } = await getTodayListings();

  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-navy-900">오늘 바이낸스 선물 상장</h2>
          <span className="text-xs text-ink-500">{listings.length}건 · 상장 예정(KST)</span>
        </div>
        <a
          href="https://t.me/NewListingsFeed"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ink-500 hover:text-navy-900"
        >
          @NewListingsFeed +
        </a>
      </header>

      {listings.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-ink-500">
          오늘 바이낸스 선물 신규 상장 소식이 아직 없습니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-x-3 gap-y-2 px-4 py-3">
          {listings.map((l) => {
            const body = (
              <>
                {l.symbol && (
                  <span className="bg-paper2 px-1 font-mono text-[11px] font-semibold text-navy-700">
                    ${l.symbol}
                  </span>
                )}
                <span className="truncate text-ink-700">{l.detail}</span>
                {l.scheduledAt ? (
                  <span
                    className="shrink-0 font-mono text-[10px] text-navy-700"
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
            return (
              <li key={l.id} className="max-w-full">
                {l.url ? (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border border-line bg-paper px-2 py-1 text-xs hover:border-navy-300"
                  >
                    {body}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 border border-line bg-paper px-2 py-1 text-xs">
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
