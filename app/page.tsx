import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPostDate } from "@/lib/format";
import TickerTable from "@/components/TickerTable";
import CryptoCalendar from "@/components/CryptoCalendar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const [recentPosts, hotPosts, analysisPosts] = await Promise.all([
    prisma.post.findMany({
      where: { board: { slug: "free" } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { author: { select: { nickname: true } } },
    }),
    prisma.post.findMany({
      orderBy: [{ upvotes: "desc" }, { viewCount: "desc" }],
      where: { upvotes: { gte: 1 } },
      take: 9,
      select: { id: true, title: true, upvotes: true },
    }),
    prisma.post.findMany({
      where: { board: { slug: "analysis" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, priceSymbol: true, createdAt: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <CryptoCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
          <h2 className="text-sm font-bold text-zinc-100">자유게시판 최신글</h2>
          <Link href="/free" className="text-xs text-zinc-400 hover:text-amber-400">
            더보기 +
          </Link>
        </header>
        {recentPosts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">
            아직 글이 없습니다. 첫 글을 작성해 보세요!
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {recentPosts.map((post) => (
              <li key={post.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                <Link
                  href={`/free/${post.id}`}
                  className="flex-1 truncate text-zinc-200 hover:text-amber-400 hover:underline"
                >
                  {post.title}
                  {post.commentCount > 0 && (
                    <span className="ml-1 text-xs text-amber-400">[{post.commentCount}]</span>
                  )}
                </Link>
                <span className="shrink-0 text-xs text-zinc-500">{post.author.nickname}</span>
                <span className="w-12 shrink-0 text-right text-xs text-zinc-500">
                  {formatPostDate(post.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-6">
        <TickerTable />
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
          <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
            <h2 className="text-sm font-bold text-zinc-100">시장 분석</h2>
            <Link href="/analysis" className="text-xs text-zinc-400 hover:text-amber-400">
              더보기 +
            </Link>
          </header>
          {analysisPosts.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">아직 분석 글이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {analysisPosts.map((post) => (
                <li key={post.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                  {post.priceSymbol && (
                    <span className="shrink-0 rounded bg-zinc-800 px-1 text-[10px] text-amber-400">
                      {post.priceSymbol}
                    </span>
                  )}
                  <Link
                    href={`/analysis/${post.id}`}
                    className="flex-1 truncate text-zinc-300 hover:text-amber-400 hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatPostDate(post.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
          <header className="border-b border-zinc-800 px-4 py-2.5">
            <h2 className="text-sm font-bold text-zinc-100">인기글 TOP 9</h2>
          </header>
          {hotPosts.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">아직 인기글이 없습니다.</p>
          ) : (
            <ol className="divide-y divide-zinc-800/60">
              {hotPosts.map((post, i) => (
                <li key={post.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                  <span className={`w-4 shrink-0 text-center text-xs font-bold ${i < 3 ? "text-amber-400" : "text-zinc-500"}`}>
                    {i + 1}
                  </span>
                  <Link
                    href={`/free/${post.id}`}
                    className="flex-1 truncate text-zinc-300 hover:text-amber-400 hover:underline"
                  >
                    {post.title}
                  </Link>
                  <span className="shrink-0 text-xs text-red-400">+{post.upvotes}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
      </div>
    </div>
  );
}
