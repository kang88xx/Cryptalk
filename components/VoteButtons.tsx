"use client";

import { useState, useTransition } from "react";
import { votePost } from "@/lib/actions";

export default function VoteButtons({
  postId,
  upvotes,
  downvotes,
}: {
  postId: number;
  upvotes: number;
  downvotes: number;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const vote = (value: 1 | -1) => {
    startTransition(async () => {
      const result = await votePost(postId, value);
      if (!result.ok) setMessage(result.message);
    });
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => vote(1)}
          disabled={pending}
          className="flex flex-col items-center gap-1 rounded-lg border border-zinc-700 px-5 py-3 hover:border-red-400/60 hover:bg-zinc-800 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-red-400">추천</span>
          <span className="text-lg font-bold text-zinc-100">{upvotes}</span>
        </button>
        <button
          onClick={() => vote(-1)}
          disabled={pending}
          className="flex flex-col items-center gap-1 rounded-lg border border-zinc-700 px-5 py-3 hover:border-blue-400/60 hover:bg-zinc-800 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-blue-400">비추천</span>
          <span className="text-lg font-bold text-zinc-100">{downvotes}</span>
        </button>
      </div>
      {message && <p className="text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
