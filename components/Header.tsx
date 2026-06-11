import Link from "next/link";
import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions";

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-zinc-50">
          Crypt<span className="text-amber-400">alk</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <span className="text-zinc-300">
                <b className="text-amber-400">{session.user.name}</b> 님
              </span>
              <form action={logout}>
                <button className="rounded border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-zinc-100">
                로그인
              </Link>
              <Link
                href="/register"
                className="rounded bg-amber-500 px-3 py-1 font-semibold text-zinc-950 hover:bg-amber-400"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 text-sm">
          <Link href="/" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            홈
          </Link>
          <Link href="/free" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            자유게시판
          </Link>
          <Link href="/analysis" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            시장분석
          </Link>
          <Link href="/dashboard" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            대시보드
          </Link>
          <Link href="/calendar" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            캘린더
          </Link>
          <Link href="/attendance" className="px-3 py-2 font-medium text-zinc-300 hover:text-amber-400">
            출석체크
          </Link>
        </div>
      </nav>
    </header>
  );
}
