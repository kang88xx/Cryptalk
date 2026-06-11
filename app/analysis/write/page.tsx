import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/lib/actions";

const EDITOR_MIN_LEVEL = 10;
const SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "TRX", "ETC", "BCH"];

export default async function AnalysisWritePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { level: true },
  });

  if ((me?.level ?? 0) < EDITOR_MIN_LEVEL) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-300">시장 분석 글은 운영진만 작성할 수 있습니다.</p>
        <Link href="/analysis" className="mt-3 inline-block text-sm text-amber-400 hover:underline">
          분석 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-lg font-bold text-zinc-100">분석 작성 — 시장 분석</h1>
      <p className="mb-4 text-xs text-zinc-500">
        등록 시 선택한 코인의 현재가가 자동 기록되며, 이후 실제 가격과 비교되어 표시됩니다.
      </p>
      <form action={createPost} className="flex flex-col gap-3">
        <input type="hidden" name="board" value="analysis" />
        <div className="flex gap-3">
          <select
            name="symbol"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            name="title"
            required
            maxLength={100}
            placeholder="제목 (예: 6월 둘째 주 BTC 주간 브리핑)"
            className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <textarea
          name="content"
          required
          maxLength={20000}
          rows={16}
          placeholder="분석 내용을 입력하세요. 출처 표기를 권장합니다."
          className="resize-y rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
        />
        <div className="flex justify-end">
          <button className="rounded bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400">
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
