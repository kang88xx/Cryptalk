import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPostDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function FreeBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const board = await prisma.board.findUnique({ where: { slug: "free" } });
  if (!board) {
    return <p className="py-10 text-center text-zinc-500">게시판을 찾을 수 없습니다.</p>;
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { boardId: board.id },
      orderBy: [{ isNotice: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { nickname: true, level: true } } },
    }),
    prisma.post.count({ where: { boardId: board.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const blockStart = Math.floor((page - 1) / 10) * 10 + 1;
  const blockEnd = Math.min(blockStart + 9, totalPages);
  const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-100">{board.name}</h1>
        <Link
          href="/free/write"
          className="rounded bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          글쓰기
        </Link>
      </div>

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
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">
                    {post.isNotice ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-400">공지</span>
                    ) : (
                      post.id
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/free/${post.id}`}
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

      <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
        {blockStart > 1 && (
          <Link href={`/free?page=${blockStart - 1}`} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800">
            이전
          </Link>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={`/free?page=${p}`}
            className={`rounded px-2.5 py-1 ${
              p === page
                ? "bg-amber-500 font-bold text-zinc-950"
                : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {p}
          </Link>
        ))}
        {blockEnd < totalPages && (
          <Link href={`/free?page=${blockEnd + 1}`} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800">
            다음
          </Link>
        )}
      </nav>
    </div>
  );
}
