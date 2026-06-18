"use client";

import { useState } from "react";

// 영문/국문 전환 버튼 — 표시만 토글(시각). 실제 번역 기능은 추후 연동.
export default function LangToggle() {
  const [lang, setLang] = useState<"KR" | "EN">("KR");
  return (
    <button
      type="button"
      onClick={() => setLang((l) => (l === "KR" ? "EN" : "KR"))}
      title="언어 (기능 준비 중)"
      className="flex items-center gap-1 text-[11px] font-semibold text-navy-500 hover:text-navy-900"
    >
      {lang}
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
