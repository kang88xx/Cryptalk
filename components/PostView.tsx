import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatDateTime, formatPostDate } from "@/lib/format";
import VoteButtons from "@/components/VoteButtons";
import CommentForm from "@/components/CommentForm";

const HOT_COMMENT_THRESHOLD = 5;

// 자유게시판 공용 글 상세 뷰
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
      <article className="border border-line bg-white">
        <header className="border-b border-line px-6 py-5">
          <p className="eyebrow mb-1">{post.board.name}</p>
          <h1 className="text-xl font-semibold text-navy-900">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="text-ink-900">
              <span className="mr-0.5 bg-paper2 px-1 font-mono text-[10px] text-navy-500">
                Lv{post.author.level}
              </span>{" "}
              {post.author.nickname}
            </span>
            <span className="font-mono">{formatDateTime(post.createdAt)}</span>
            <span>조회 {post.viewCount + 1}</span>
            <span>
              추천 <span className="text-red-600">{post.upvotes}</span> · 비추천{" "}
              <span className="text-indigo-700">{post.downvotes}</span>
            </span>
            <span>댓글 {post.commentCount}</span>
          </div>
        </header>

        <div className="whitespace-pre-wrap px-6 py-7 text-[15px] leading-7 text-ink-900">
          {post.content}
        </div>

        <VoteButtons postId={post.id} upvotes={post.upvotes} downvotes={post.downvotes} />
      </article>

      <section className="mt-4 border border-line bg-white">
        <header className="border-b border-line px-6 py-3">
          <h2 className="text-sm font-semibold text-navy-900">댓글 {post.comments.length}</h2>
        </header>

        {hotComments.length > 0 && (
          <div className="border-b border-line bg-amber-300/20 px-6 py-3">
            <p className="eyebrow mb-2">★ Hot Comments</p>
            <ul className="space-y-2">
              {hotComments.map((c) => (
                <li key={`hot-${c.id}`} className="text-sm">
                  <span className="mr-2 text-xs text-ink-500">{c.author.nickname}</span>
                  <span className="text-ink-900">{c.content}</span>
                  <span className="ml-2 text-xs text-red-600">+{c.upvotes}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {post.comments.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-500">첫 댓글을 남겨보세요.</p>
        ) : (
          <ul className="divide-y divide-line">
            {post.comments.map((c) => (
              <li key={c.id} className="px-6 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-ink-500">
                  <span className="text-ink-900">
                    <span className="mr-0.5 bg-paper2 px-1 font-mono text-[10px] text-navy-500">
                      Lv{c.author.level}
                    </span>{" "}
                    {c.author.nickname}
                  </span>
                  <span className="font-mono">{formatPostDate(c.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink-900">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-line px-6 py-4">
          {session?.user ? (
            <CommentForm postId={post.id} />
          ) : (
            <p className="text-center text-sm text-ink-500">
              댓글을 작성하려면{" "}
              <Link href="/login" className="text-navy-700 underline-offset-2 hover:underline">
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
          className="inline-block border border-navy-300 px-4 py-1.5 text-sm text-ink-500 hover:border-navy-900 hover:text-navy-900"
        >
          목록으로
        </Link>
      </div>
    </div>
  );
}
