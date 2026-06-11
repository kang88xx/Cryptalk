"use client";

import { useTransition } from "react";
import { deletePortfolioItem } from "@/lib/actions";

export default function PortfolioDeleteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deletePortfolioItem(id))}
      className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
