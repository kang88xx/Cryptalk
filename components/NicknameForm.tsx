"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeNickname } from "@/lib/actions";

export default function NicknameForm({
  currentNickname,
  remaining,
  confirmed,
}: {
  currentNickname: string;
  remaining: number; // 남은 변경 횟수
  confirmed: boolean; // false면 최초 설정(무료)
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentNickname);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [left, setLeft] = useState(remaining);

  // 확정 사용자가 변경 횟수를 모두 쓴 경우 입력 잠금
  const locked = confirmed && left <= 0;

  function submit() {
    const next = value.trim();
    if (!next || pending || locked) return;
    const fd = new FormData();
    fd.set("nickname", next);
    startTransition(async () => {
      const res = await changeNickname(fd);
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) {
        if (typeof res.remaining === "number") setLeft(res.remaining);
        router.refresh(); // 헤더 등 닉네임 즉시 반영
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={locked}
          minLength={2}
          maxLength={12}
          placeholder="닉네임 (2~12자, 공백 불가)"
          className="flex-1 border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none disabled:bg-paper disabled:text-ink-500"
        />
        <button
          onClick={submit}
          disabled={pending || locked || value.trim().length < 2}
          className="shrink-0 bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "저장 중…" : confirmed ? "변경" : "설정"}
        </button>
      </div>

      {/* 안내 — 미확정(최초 설정)이면 무료 안내, 아니면 남은 횟수 */}
      {!confirmed ? (
        <p className="text-xs text-ink-500">
          활동에 사용할 닉네임을 설정해 주세요. 최초 설정은 변경 횟수에 포함되지 않아요.
        </p>
      ) : locked ? (
        <p className="text-xs text-red-600">닉네임 변경 횟수(3회)를 모두 사용했습니다.</p>
      ) : (
        <p className="text-xs text-ink-500">
          남은 변경 횟수 <b className="font-semibold text-navy-900">{left}</b> / {3}회
        </p>
      )}

      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
