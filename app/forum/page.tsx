import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTickers } from "@/lib/ticker";
import { formatKrw, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

function changeColor(n: number | null): string {
  if (n == null) return "text-zinc-400";
  if (n > 0) return "text-red-400";
  if (n < 0) return "text-blue-400";
  return "text-zinc-400";
}

export default async function ForumIndexPage() {
  const [boards, snapshot] = await Promise.all([
    prisma.board.findMany({
      where: { type: "forum" },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { posts: true } },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, title: true },
        },
      },
    }),
    getTickers(),
  ]);

  const tickerMap = new Map(snapshot.tickers.map((t) => [t.symbol, t]));

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-zinc-100">코인별 포럼</h1>
      <p className="mb-4 text-xs text-zinc-500">
        코인 하나당 전용 게시판 — 종목 토론은 여기서, 실시간 시세와 함께.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => {
          const t = board.coinSymbol ? tickerMap.get(board.coinSymbol) : null;
          const latest = board.posts[0];
          return (
            <Link
              key={board.id}
              href={`/forum/${board.slug}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-600"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold text-zinc-100">
                  {board.name}{" "}
                  <span className="text-xs font-semibold text-amber-400">{board.coinSymbol}</span>
                </h2>
                <span className="text-xs text-zinc-500">글 {board._count.posts}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-zinc-200">
                  {formatKrw(t?.priceKrw ?? null)}원
                </span>
                <span className={`text-xs ${changeColor(t?.change24h ?? null)}`}>
                  {formatPercent(t?.change24h ?? null)}
                </span>
                <span className="text-xs text-amber-400/80">
                  김프 {formatPercent(t?.kimchiPremium ?? null)}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-zinc-500">
                {latest ? `최신글: ${latest.title}` : "첫 글을 작성해 보세요"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
