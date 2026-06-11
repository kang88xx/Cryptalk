import PostView from "@/components/PostView";

export const dynamic = "force-dynamic";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ symbol: string; id: string }>;
}) {
  const { symbol, id } = await params;
  const slug = symbol.toLowerCase();
  return <PostView idParam={id} boardSlug={slug} backHref={`/forum/${slug}`} />;
}
