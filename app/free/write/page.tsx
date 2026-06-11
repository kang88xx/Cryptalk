import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPost } from "@/lib/actions";

export default async function WritePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-bold text-zinc-100">글쓰기 — 자유게시판</h1>
      <form action={createPost} className="flex flex-col gap-3">
        <input type="hidden" name="board" value="free" />
        <input
          name="title"
          required
          maxLength={100}
          placeholder="제목"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <textarea
          name="content"
          required
          maxLength={20000}
          rows={14}
          placeholder="내용을 입력하세요"
          className="resize-y rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button className="rounded bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400">
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
