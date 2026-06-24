"use client";

import { useFormStatus } from "react-dom";

// 서버 액션 <form> 안에서 pending 상태를 감지해 비활성화+레이블 변경하는 제출 버튼.
// useFormStatus 는 반드시 form 의 자식 컴포넌트여야 동작함 (React 19 / Next 16).
export default function SubmitButton({ label = "등록", pendingLabel = "등록 중…" }: {
  label?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-amber-500 px-5 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
