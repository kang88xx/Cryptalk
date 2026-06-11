"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const nickname = String(form.get("nickname") ?? "");
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      setPending(false);
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nickname, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "회원가입에 실패했습니다.");
      setPending(false);
      return;
    }

    // 가입 직후 자동 로그인
    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
      <h1 className="mb-5 text-center text-lg font-bold text-zinc-100">회원가입</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="이메일"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <input
          name="nickname"
          required
          minLength={2}
          maxLength={12}
          placeholder="닉네임 (2~12자)"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="비밀번호 (8자 이상)"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <input
          name="passwordConfirm"
          type="password"
          required
          minLength={8}
          placeholder="비밀번호 확인"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          disabled={pending}
          className="rounded bg-amber-500 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        이미 회원이신가요?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
