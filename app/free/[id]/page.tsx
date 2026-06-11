import PostView from "@/components/PostView";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostView idParam={id} boardSlug="free" backHref="/free" />;
}
