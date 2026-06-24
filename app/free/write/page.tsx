import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPost } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function WritePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Write</p>
      <h1 className="mb-4 text-lg font-semibold text-navy-900">글쓰기 — 자유게시판</h1>
      <form action={createPost} className="flex flex-col gap-3">
        <input type="hidden" name="board" value="free" />
        <input
          name="title"
          required
          maxLength={100}
          placeholder="제목"
          className="border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
        <textarea
          name="content"
          required
          maxLength={20000}
          rows={14}
          placeholder="내용을 입력하세요"
          className="resize-y border border-navy-300 bg-white px-3 py-2 text-sm leading-6 text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
