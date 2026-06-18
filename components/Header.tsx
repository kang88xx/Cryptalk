import Link from "next/link";
import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions";

const NAV = [
  ["/", "홈"],
  ["/dashboard", "대시보드"],
  ["/free", "자유게시판"],
  ["/analysis", "시장분석"],
  ["/calendar", "캘린더"],
];

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-y-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 md:flex-1">
          <span className="inline-block h-3.5 w-3.5 bg-amber-500" aria-hidden />
          <span className="text-xl font-semibold uppercase tracking-tight text-navy-900">
            Cryptalk
          </span>
        </Link>

        {/* 가운데 메뉴 — 모바일에서는 둘째 줄 가로 스크롤, 데스크톱에서는 페이지 정중앙 */}
        <nav className="order-3 -mx-4 flex w-screen items-center gap-1 overflow-x-auto px-4 text-sm whitespace-nowrap md:order-none md:mx-0 md:w-auto md:shrink-0 md:justify-center md:px-0">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 border-b-2 border-transparent px-3 py-1.5 font-medium text-ink-500 hover:border-amber-500 hover:text-navy-900"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 우측 — 회원 · 출석체크(로그인 시) */}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-sm md:ml-0 md:flex-1 md:justify-end">
          {session?.user ? (
            <>
              <Link
                href="/attendance"
                className="border-b-2 border-transparent py-1.5 font-medium text-ink-500 hover:border-amber-500 hover:text-navy-900"
              >
                출석체크
              </Link>
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
