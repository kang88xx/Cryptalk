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
          className="flex flex-col items-center gap-1 border border-line px-5 py-3 hover:border-red-600/60 hover:bg-paper2 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-red-600">추천</span>
          <span className="text-lg font-bold text-navy-900">{upvotes}</span>
        </button>
        <button
          onClick={() => vote(-1)}
          disabled={pending}
          className="flex flex-col items-center gap-1 border border-line px-5 py-3 hover:border-indigo-700/60 hover:bg-paper2 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-indigo-700">비추천</span>
          <span className="text-lg font-bold text-navy-900">{downvotes}</span>
        </button>
      </div>
      {message && <p className="text-xs text-ink-500">{message}</p>}
    </div>
  );
}
