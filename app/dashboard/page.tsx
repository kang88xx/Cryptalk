import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getTickers } from "@/lib/ticker";
import { formatKrw, formatPercent } from "@/lib/format";
import MarketCards from "@/components/MarketCards";
import PortfolioForm from "@/components/PortfolioForm";
import PortfolioDeleteButton from "@/components/PortfolioDeleteButton";

export const dynamic = "force-dynamic";

function pnlColor(n: number | null): string {
  if (n == null) return "text-ink-500";
  if (n > 0) return "text-red-600";
  if (n < 0) return "text-indigo-700";
  return "text-ink-500";
}

export default async function DashboardPage() {
  const [session, snapshot] = await Promise.all([auth(), getTickers()]);

  const items = session?.user?.id
    ? await prisma.portfolioItem.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const priceNow = new Map(snapshot.tickers.map((t) => [t.symbol, t.priceKrw]));

  const rows = items.map((item) => {
    const current = priceNow.get(item.symbol) ?? null;
    const buyTotal = item.quantity * item.buyPrice;
    const curTotal = current != null ? item.quantity * current : null;
    const pnl = curTotal != null ? ((curTotal - buyTotal) / buyTotal) * 100 : null;
    return { item, current, buyTotal, curTotal, pnl };
  });

  const totalBuy = rows.reduce((sum, r) => sum + r.buyTotal, 0);
  const totalNow = rows.reduce((sum, r) => sum + (r.curTotal ?? r.buyTotal), 0);
  const totalPnl = totalBuy > 0 ? ((totalNow - totalBuy) / totalBuy) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Data Dashboard</p>
        <h1 className="mb-4 text-lg font-semibold text-navy-900">데이터 대시보드</h1>
        <MarketCards />
      </div>

      <section className="border border-line bg-white">
        <header className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-navy-900">나의 포트폴리오</h2>
          <p className="text-[11px] text-ink-500">
            보유 코인을 수기로 입력하면 현재 시세 기준 총 자산이 계산됩니다.
          </p>
        </header>

        {!session?.user ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">
            포트폴리오는{" "}
            <Link href="/login" className="text-navy-700 underline-offset-2 hover:underline">
              로그인
            </Link>{" "}
            후 작성할 수 있습니다.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-500">나의 총 자산 (현재 평가)</p>
                <p className="mt-0.5 font-mono text-2xl font-bold text-navy-900">
                  {formatKrw(totalNow)}원
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-500">총 매수금액</p>
                <p className="mt-0.5 font-mono text-2xl font-bold text-navy-900">{formatKrw(totalBuy)}원</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">평가손익</p>
                <p className={`mt-0.5 font-mono text-2xl font-bold ${pnlColor(totalPnl)}`}>
                  {formatKrw(totalNow - totalBuy)}원{" "}
                  <span className="text-sm">({formatPercent(totalPnl)})</span>
                </p>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-500">
                아래에서 보유 코인을 추가해 보세요.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-900 text-xs font-light text-white">
                    <th className="px-5 py-2 text-left font-normal">코인</th>
                    <th className="px-2 py-2 text-right font-normal">수량</th>
                    <th className="px-2 py-2 text-right font-normal">매수단가</th>
                    <th className="px-2 py-2 text-right font-normal">매수금액</th>
                    <th className="px-2 py-2 text-right font-normal">현재가</th>
                    <th className="px-2 py-2 text-right font-normal">평가금액</th>
                    <th className="px-2 py-2 text-right font-normal">수익률</th>
                    <th className="w-16 px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, current, buyTotal, curTotal, pnl }) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-2 font-semibold text-navy-900">{item.symbol}</td>
                      <td className="px-2 py-2 text-right text-ink-900">
                        {item.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}
                      </td>
                      <td className="px-2 py-2 text-right text-ink-900">
                        {formatKrw(item.buyPrice)}
                      </td>
                      <td className="px-2 py-2 text-right text-ink-900">{formatKrw(buyTotal)}</td>
                      <td className="px-2 py-2 text-right text-ink-900">{formatKrw(current)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-navy-900">
                        {formatKrw(curTotal)}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${pnlColor(pnl)}`}>
                        {formatPercent(pnl)}
                      </td>
                      <td className="px-5 py-2 text-right">
                        <PortfolioDeleteButton id={item.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="border-t border-line px-5 py-4">
              <PortfolioForm />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
