import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/actions";
import { todayVisits, recentVisits, kstDay } from "@/lib/visits";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!(await isAdmin())) redirect("/");

  const today = kstDay();
  const [todayCount, recent] = await Promise.all([todayVisits(), recentVisits(7)]);
  const maxCount = Math.max(1, ...recent.map((r) => r.count));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Admin</p>
      <h1 className="mb-4 text-lg font-semibold text-navy-900">대시보드</h1>

      {/* 금일 총 접속자 */}
      <section className="mb-6 border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-navy-900">금일 총 접속자</h2>
        </header>
        <div className="px-4 py-6">
          <p className="font-mono text-4xl font-semibold tracking-tight text-navy-900">
            {todayCount.toLocaleString()}
            <span className="ml-2 align-middle text-sm font-normal text-ink-500">명 (KST {today})</span>
          </p>
        </div>
      </section>

      {/* 최근 7일 추이 */}
      <section className="mb-6 border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-navy-900">최근 7일 접속자</h2>
        </header>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">아직 집계된 접속 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((r) => (
              <li key={r.day} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-24 shrink-0 font-mono text-xs text-ink-500">{r.day}</span>
                <span className="relative h-4 flex-1 overflow-hidden bg-paper2">
                  <span
                    className="absolute inset-y-0 left-0 bg-navy-700"
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold text-navy-900">
                  {r.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/admin/prizes"
        className="inline-block border border-navy-300 px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900 hover:text-navy-900"
      >
        랜덤박스 상품 관리 →
      </Link>
    </div>
  );
}
