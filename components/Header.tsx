import Link from "next/link";
import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions";

const NAV = [
  ["/", "홈"],
  ["/free", "자유게시판"],
  ["/analysis", "시장분석"],
  ["/calendar", "캘린더"],
  ["/attendance", "출석체크"],
];

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 bg-amber-500" aria-hidden />
          <span className="text-xl font-semibold uppercase tracking-tight text-navy-900">
            Cryptalk
          </span>
        </Link>

        {/* 가운데 메뉴 */}
        <nav className="flex flex-1 items-center justify-center gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="border-b-2 border-transparent px-3 py-1.5 font-medium text-ink-500 hover:border-amber-500 hover:text-navy-900"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 우측 — 대시보드 · 회원 */}
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="border-b-2 border-transparent py-1.5 font-medium text-ink-500 hover:border-amber-500 hover:text-navy-900"
          >
            대시보드
          </Link>
          {session?.user ? (
            <>
              <span className="text-ink-500">
                <b className="font-semibold text-navy-900">{session.user.name}</b> 님
              </span>
              <form action={logout}>
                <button className="border border-navy-300 px-3 py-1 text-ink-500 hover:border-navy-900 hover:text-navy-900">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink-500 hover:text-navy-900">
                로그인
              </Link>
              <Link
                href="/register"
                className="bg-navy-900 px-4 py-1.5 font-medium text-white hover:bg-navy-700"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
