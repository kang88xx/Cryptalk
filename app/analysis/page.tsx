import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { auth } from "@/lib/auth";
import { formatKrw, formatPercent, formatPostDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const EDITOR_MIN_LEVEL = 10;

export default async function AnalysisPage() {
  const [board, snapshot, session] = await Promise.all([
    prisma.board.findUnique({ where: { slug: "analysis" } }),
    getTickers(),
    auth(),
  ]);
  if (!board) {
    return <p className="py-10 text-center text-zinc-500">게시판을 찾을 수 없습니다.</p>;
  }

  const posts = await prisma.post.findMany({
    where: { boardId: board.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { nickname: true, level: true } } },
  });

  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { level: true } })
    : null;
  const canWrite = (me?.level ?? 0) >= EDITOR_MIN_LEVEL;

  const priceNow = new Map(snapshot.tickers.map((t) => [t.symbol, t.priceKrw]));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">시장 분석</h1>
          <p className="text-xs text-zinc-500">
            운영진이 작성하는 공식 분석입니다. 작성 시점 가격이 자동 기록되어 현재가와 비교됩니다.
          </p>
        </div>
        {canWrite && (
          <Link
            href="/analysis/write"
            className="rounded bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            분석 작성
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 py-12 text-center text-sm text-zinc-500">
          아직 분석 글이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const now = post.priceSymbol ? priceNow.get(post.priceSymbol) ?? null : null;
            const change =
              post.priceAtPost != null && now != null
                ? ((now - post.priceAtPost) / post.priceAtPost) * 100
                : null;
            return (
              <Link
                key={post.id}
                href={`/analysis/${post.id}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-zinc-100">
                    {post.title}
                    {post.commentCount > 0 && (
                      <span className="ml-1 text-xs text-amber-400">[{post.commentCount}]</span>
                    )}
                  </h2>
                  {post.priceAtPost != null && post.priceSymbol && (
                    <span className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[11px]">
                      <b className="text-zinc-300">{post.priceSymbol}</b>{" "}
                      <span className="text-zinc-500">작성시 {formatKrw(post.priceAtPost)}</span>
                      {change != null && (
                        <span
                          className={`ml-1 font-semibold ${
                            change > 0 ? "text-red-400" : change < 0 ? "text-blue-400" : "text-zinc-400"
                          }`}
                        >
                          이후 {formatPercent(change)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{post.content}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {post.author.nickname} · {formatPostDate(post.createdAt)} · 조회 {post.viewCount} · 추천{" "}
                  {post.upvotes}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
