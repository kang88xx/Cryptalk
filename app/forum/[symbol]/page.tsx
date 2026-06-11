import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { formatKrw, formatPercent, formatPostDate, formatVolume } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function changeColor(n: number | null): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-red-400";
  if (n < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default async function ForumBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ symbol }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const slug = symbol.toLowerCase();
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const board = await prisma.board.findUnique({ where: { slug } });
  if (!board || board.type !== "forum") notFound();

  const [snapshot, posts, total] = await Promise.all([
    getTickers(),
    prisma.post.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { nickname: true, level: true } } },
    }),
    prisma.post.count({ where: { boardId: board.id } }),
  ]);

  const t = board.coinSymbol
    ? snapshot.tickers.find((x) => x.symbol === board.coinSymbol) ?? null
    : null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* 코인 데이터 고정 헤더 — 포럼 상단에 해당 코인 시세 노출 */}
      <section className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <h1 className="text-lg font-bold text-zinc-100">
          {board.name} <span className="text-sm font-semibold text-amber-400">{board.coinSymbol}</span>
        </h1>
        <span className="text-xl font-bold text-zinc-100">{formatKrw(t?.priceKrw ?? null)}원</span>
        <span className={`text-sm font-semibold ${changeColor(t?.change24h ?? null)}`}>
          24H {formatPercent(t?.change24h ?? null)}
        </span>
        <span className="text-sm text-amber-400/90">
          김프 {formatPercent(t?.kimchiPremium ?? null)}
        </span>
        <span className="text-xs text-zinc-500">
          거래대금 {formatVolume(t?.volumeKrw24h ?? null)} · ${t?.priceUsd?.toLocaleString() ?? "-"}
        </span>
        <Link
          href={`/forum/${slug}/write`}
          className="ml-auto rounded bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          글쓰기
        </Link>
      </section>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th className="w-16 px-2 py-2 font-medium">번호</th>
              <th className="px-2 py-2 text-left font-medium">제목</th>
              <th className="w-24 px-2 py-2 font-medium">닉네임</th>
              <th className="w-20 px-2 py-2 font-medium">등록일</th>
              <th className="w-14 px-2 py-2 font-medium">조회</th>
              <th className="w-16 px-2 py-2 font-medium">추천</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  아직 글이 없습니다. 첫 글을 작성해 보세요!
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40">
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">{post.id}</td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/forum/${slug}/${post.id}`}
                      className="text-zinc-200 hover:text-amber-400 hover:underline"
                    >
                      {post.title}
                    </Link>
                    {post.commentCount > 0 && (
                      <span className="ml-1 text-xs text-amber-400">[{post.commentCount}]</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-400">
                    <span className="mr-0.5 rounded bg-zinc-800 px-1 text-[10px] text-zinc-500">
                      Lv{post.author.level}
                    </span>
                    {post.author.nickname}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">
                    {formatPostDate(post.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">{post.viewCount}</td>
                  <td className="px-2 py-2 text-center text-xs">
                    <span className="text-red-400">{post.upvotes}</span>
                    <span className="text-zinc-600"> - </span>
                    <span className="text-blue-400">{post.downvotes}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/forum/${slug}?page=${p}`}
              className={`rounded px-2.5 py-1 ${
                p === page ? "bg-amber-500 font-bold text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-4">
        <Link
          href="/forum"
          className="inline-block rounded border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          포럼 목록
        </Link>
      </div>
    </div>
  );
}
