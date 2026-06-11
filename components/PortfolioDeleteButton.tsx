"use client";

import { useTransition } from "react";
import { deletePortfolioItem } from "@/lib/actions";

export default function PortfolioDeleteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deletePortfolioItem(id))}
      className="border border-navy-300 px-2 py-0.5 text-xs text-ink-500 hover:border-red-600/60 hover:text-red-600 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
