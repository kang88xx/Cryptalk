import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatDateTime, formatPostDate } from "@/lib/format";
import VoteButtons from "@/components/VoteButtons";
import CommentForm from "@/components/CommentForm";

const HOT_COMMENT_THRESHOLD = 5;

// 자유게시판·코인 포럼 공용 글 상세 뷰
export default async function PostView({
  idParam,
  boardSlug,
  backHref,
}: {
  idParam: string;
  boardSlug: string;
  backHref: string;
}) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) notFound();

  const session = await auth();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      board: { select: { slug: true, name: true } },
      author: { select: { nickname: true, level: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { nickname: true, level: true } } },
      },
    },
  });
  if (!post || post.board.slug !== boardSlug) notFound();

  // 조회수 증가 (실패는 무시)
  prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const hotComments = post.comments.filter((c) => c.upvotes >= HOT_COMMENT_THRESHOLD);

  return (
    <div className="mx-auto max-w-4xl">
      <article className="rounded-lg border border-zinc-800 bg-zinc-900/60">
        <header className="border-b border-zinc-800 px-5 py-4">
          <p className="mb-1 text-xs text-zinc-500">{post.board.name}</p>
          <h1 className="text-xl font-bold text-zinc-50">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="text-zinc-300">
              <span className="mr-0.5 rounded bg-zinc-800 px-1 text-[10px]">Lv{post.author.level}</span>{" "}
              {post.author.nickname}
            </span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span>조회 {post.viewCount + 1}</span>
            <span>
              추천 <span className="text-red-400">{post.upvotes}</span> · 비추천{" "}
              <span className="text-blue-400">{post.downvotes}</span>
            </span>
            <span>댓글 {post.commentCount}</span>
          </div>
        </header>

        <div className="whitespace-pre-wrap px-5 py-6 text-[15px] leading-7 text-zinc-200">
          {post.content}
        </div>

        <VoteButtons postId={post.id} upvotes={post.upvotes} downvotes={post.downvotes} />
      </article>

      <section className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60">
        <header className="border-b border-zinc-800 px-5 py-2.5">
          <h2 className="text-sm font-bold text-zinc-100">댓글 {post.comments.length}</h2>
        </header>

        {hotComments.length > 0 && (
          <div className="border-b border-zinc-800 bg-amber-500/5 px-5 py-3">
            <p className="mb-2 text-xs font-bold text-amber-400">★ 핫코멘트</p>
            <ul className="space-y-2">
              {hotComments.map((c) => (
                <li key={`hot-${c.id}`} className="text-sm">
                  <span className="mr-2 text-xs text-zinc-400">{c.author.nickname}</span>
                  <span className="text-zinc-200">{c.content}</span>
                  <span className="ml-2 text-xs text-red-400">+{c.upvotes}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {post.comments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">첫 댓글을 남겨보세요.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {post.comments.map((c) => (
              <li key={c.id} className="px-5 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="text-zinc-300">
                    <span className="mr-0.5 rounded bg-zinc-800 px-1 text-[10px]">
                      Lv{c.author.level}
                    </span>{" "}
                    {c.author.nickname}
                  </span>
                  <span>{formatPostDate(c.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-200">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-zinc-800 px-5 py-4">
          {session?.user ? (
            <CommentForm postId={post.id} />
          ) : (
            <p className="text-center text-sm text-zinc-500">
              댓글을 작성하려면{" "}
              <Link href="/login" className="text-amber-400 hover:underline">
                로그인
              </Link>
              이 필요합니다.
            </p>
          )}
        </div>
      </section>

      <div className="mt-4">
        <Link
          href={backHref}
          className="inline-block rounded border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
