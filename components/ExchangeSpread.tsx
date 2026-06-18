import { getExchangeSpread } from "@/lib/ticker";
import { formatKrw, formatPercent, formatRelativeTime } from "@/lib/format";

function spreadColor(n: number): string {
  if (n > 0) return "text-red-600"; // 업비트가 더 비쌈
  if (n < 0) return "text-indigo-700"; // 빗썸이 더 비쌈
  return "text-ink-500";
}

// 업비트 ↔ 빗썸 동일 코인 가격 괴리 (차익 신호) — 괴리 큰 순
export default async function ExchangeSpread() {
  const { rows, updatedAt } = await getExchangeSpread();
  const hasData = rows.length > 0;

  return (
    <section className="flex flex-col border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-navy-900">업비트 ↔ 빗썸 괴리율</h2>
          <span className="eyebrow hidden sm:inline">Exchange Spread</span>
        </div>
        <span className="text-[10px] text-navy-300">
          {hasData ? `${formatRelativeTime(updatedAt)} · 업비트·빗썸` : "데이터 없음"}
        </span>
      </header>

      {!hasData ? (
        <p className="px-4 py-8 text-center text-sm text-ink-500">데이터를 불러오지 못했습니다.</p>
      ) : (
        <ul className="divide-y divide-line">
          <li className="flex items-center gap-3 px-4 py-1.5 text-[10px] text-navy-300">
            <span className="w-12 shrink-0">코인</span>
            <span className="flex-1 text-right">업비트</span>
            <span className="flex-1 text-right">빗썸</span>
            <span className="w-16 shrink-0 text-right">괴리</span>
          </li>
          {rows.map((r) => (
            <li key={r.symbol} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-12 shrink-0 font-semibold text-navy-900">{r.symbol}</span>
              <span className="flex-1 text-right font-mono text-ink-900">{formatKrw(r.upbit)}</span>
              <span className="flex-1 text-right font-mono text-ink-500">{formatKrw(r.bithumb)}</span>
              <span className={`w-16 shrink-0 text-right font-mono font-semibold ${spreadColor(r.spread)}`}>
                {formatPercent(r.spread)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-line px-4 py-2">
        <span className="rail">+ 업비트가 비쌈 · − 빗썸이 비쌈</span>
      </p>
    </section>
  );
}
