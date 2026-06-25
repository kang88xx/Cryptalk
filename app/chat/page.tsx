import { auth } from "@/lib/auth";
import ChatRoom from "@/components/ChatRoom";

export const dynamic = "force-dynamic";

export const metadata = { title: "실시간 채팅 · Cryptalk" };

export default async function ChatPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-navy-900">실시간 채팅</h1>
        <p className="mt-1 text-sm text-ink-500">
          크립톡 회원들과 실시간으로 이야기를 나눠보세요.
        </p>
      </div>
      <ChatRoom currentUserId={userId} isLoggedIn={!!userId} />
    </div>
  );
}
