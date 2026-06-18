import { getIndices } from "@/lib/indices";
import { formatPercent } from "@/lib/format";

function changeColor(n: number | null): string {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

// 상단 배너 — 나스닥 / 코스피 / 코스닥 지수 (글로벌·국내 증시 한눈에)
export default async function IndexBanner() {
  const { items } = await getIndices();

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center gap-x-5 overflow-x-auto px-4 py-1.5 text-[11px] whitespace-nowrap">
        {items.length === 0 ? (
          <span className="rail">지수 불러오는 중…</span>
        ) : (
          items.map((it) => (
            <span key={it.label} className="flex items-center gap-1.5">
              <span className="font-medium text-navy-500">{it.label}</span>
              <span className="font-mono text-navy-900">
                {it.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`font-mono ${changeColor(it.changePct)}`}>
                {formatPercent(it.changePct)}
              </span>
            </span>
          ))
        )}
        <span className="rail ml-auto hidden sm:inline">Nasdaq · KOSPI · KOSDAQ</span>
      </div>
    </div>
  );
}
