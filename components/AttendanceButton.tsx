"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkAttendance } from "@/lib/actions";

export default function AttendanceButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkAttendance();
            setMessage(result.message);
            router.refresh();
          })
        }
        className="rounded-lg bg-amber-500 px-8 py-3 text-base font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "출석 중..." : "출석체크 (+10P)"}
      </button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
