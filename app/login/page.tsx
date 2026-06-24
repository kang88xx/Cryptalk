"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import InAppBrowserNotice from "@/components/InAppBrowserNotice";
import { isInAppBrowser, openExternalBrowser } from "@/lib/inapp";

// 오픈리다이렉트/javascript:/백슬래시 우회 차단 — 동일 출처 경로만 허용
function safeCallback(raw: string | null): string {
  if (!raw) return "/";
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin === window.location.origin) return u.pathname + u.search + u.hash;
  } catch {
    // 파싱 불가 → 기본 경로
  }
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    setPending(false);
    if (result?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push(safeCallback(searchParams.get("callbackUrl")));
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm border border-line bg-white p-6">
      <h1 className="mb-5 text-center text-lg font-semibold text-navy-900">로그인</h1>
      <InAppBrowserNotice />
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="이메일"
          className="border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="비밀번호"
          className="border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          disabled={pending}
          className="bg-amber-500 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] text-navy-300">또는</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        type="button"
        onClick={() => {
          // 인앱 브라우저면 구글로 보내지 말고 외부 브라우저로 전환(403 차단 회피)
          if (isInAppBrowser()) {
            openExternalBrowser();
            return;
          }
          signIn("google", { callbackUrl: safeCallback(searchParams.get("callbackUrl")) });
        }}
        className="flex w-full items-center justify-center gap-2 border border-navy-300 bg-white py-2 text-sm font-medium text-ink-900 hover:border-navy-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
        </svg>
        Google로 계속하기
      </button>
      <p className="mt-4 text-center text-xs text-ink-500">
        아직 회원이 아니신가요?{" "}
        <Link href="/register" className="text-navy-700 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
