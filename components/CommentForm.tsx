"use client";

import { useRef, useTransition } from "react";
import { createComment } from "@/lib/actions";

export default function CommentForm({ postId }: { postId: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await createComment(postId, formData);
          formRef.current?.reset();
        });
      }}
      className="flex gap-2"
    >
      <textarea
        name="content"
        required
        maxLength={2000}
        rows={2}
        placeholder="댓글을 입력하세요"
        className="flex-1 resize-none border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
      />
      <button
        disabled={pending}
        className="self-end bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}
