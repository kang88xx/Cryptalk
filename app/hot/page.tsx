import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPostDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const HOT_UPVOTES = 3;
const HOT_VIEWS = 30;

function postHref(board: { slug: string; type: string }, id: number): string {
  return board.type === "forum" ? `/forum/${board.slug}/${id}` : `/${board.slug}/${id}`;
}

export default async function HotPage() {
  const posts = await prisma.post.findMany({
    where: {
      isNotice: false,
      OR: [{ upvotes: { gte: HOT_UPVOTES } }, { viewCount: { gte: HOT_VIEWS } }],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      board: { select: { slug: true, name: true, type: true } },
      author: { select: { nickname: true, level: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-zinc-100">HOT 게시물</h1>
      <p className="mb-4 text-xs text-zinc-500">
        추천 {HOT_UPVOTES}개 이상 또는 조회 {HOT_VIEWS}회 이상인 글이 자동으로 모입니다.
      </p>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th className="w-24 px-2 py-2 font-medium">게시판</th>
              <th className="px-2 py-2 text-left font-medium">제목</th>
              <th className="w-24 px-2 py-2 font-medium">닉네임</th>
              <th className="w-20 px-2 py-2 font-medium">등록일</th>
              <th className="w-14 px-2 py-2 font-medium">조회</th>
              <th className="w-14 px-2 py-2 font-medium">추천</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  아직 HOT 게시물이 없습니다. 추천과 조회가 쌓이면 자동으로 등록됩니다.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40">
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">{post.board.name}</td>
                  <td className="px-2 py-2">
                    <Link
                      href={postHref(post.board, post.id)}
                      className="text-zinc-200 hover:text-amber-400 hover:underline"
                    >
                      {post.title}
                    </Link>
                    {post.commentCount > 0 && (
                      <span className="ml-1 text-xs text-amber-400">[{post.commentCount}]</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-400">{post.author.nickname}</td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">
                    {formatPostDate(post.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-zinc-500">{post.viewCount}</td>
                  <td className="px-2 py-2 text-center text-xs text-red-400">{post.upvotes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
