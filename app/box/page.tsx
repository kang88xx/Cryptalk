import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BOX_COST } from "@/lib/box";
import RandomBox, { type PrizeLite } from "@/components/RandomBox";

export const dynamic = "force-dynamic";

const RARITY_COLOR: Record<string, string> = {
  common: "#a0a6bb",
  rare: "#636ddb",
  epic: "#efc540",
  legendary: "#dc2626",
};

export default async function BoxPage() {
  const session = await auth();
  const myId = session?.user?.id ?? null;

  const [prizes, me, recentWins] = await Promise.all([
    prisma.prize.findMany({
      where: { active: true, OR: [{ stock: null }, { stock: { gt: 0 } }] },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, name: true, description: true, imageUrl: true, rarity: true },
    }),
    myId ? prisma.user.findUnique({ where: { id: myId }, select: { points: true } }) : null,
    prisma.prizeWin.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        prize: { select: { name: true, rarity: true } },
        user: { select: { nickname: true } },
      },
    }),
  ]);

  const points = me?.points ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Lucky Box</p>
      <h1 className="mb-1 text-lg font-semibold text-navy-900">랜덤박스</h1>
      <p className="mb-4 text-xs text-ink-500">
        글쓰기·댓글·출석으로 모은 포인트로 박스를 열어보세요. 한 번에 {BOX_COST}P가 소모됩니다.
      </p>

      <section className="border border-line bg-white p-4">
        {!session?.user ? (
          <p className="py-8 text-center text-sm text-ink-500">
            랜덤박스는{" "}
            <Link href="/login" className="text-navy-700 underline-offset-2 hover:underline">
              로그인
            </Link>{" "}
            후 이용할 수 있습니다.
          </p>
        ) : (
          <RandomBox
            prizes={prizes as PrizeLite[]}
            cost={BOX_COST}
            points={points}
            loggedIn={!!session?.user}
          />
        )}
      </section>

      {/* 최근 당첨 피드 */}
      <section className="mt-4 border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-navy-900">최근 당첨</h2>
        </header>
        {recentWins.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">
            아직 당첨 기록이 없습니다. 첫 박스를 열어보세요!
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recentWins.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: RARITY_COLOR[w.prize.rarity] ?? RARITY_COLOR.common }}
                />
                <span className="text-ink-900">
                  <b className="font-semibold text-navy-900">{w.user.nickname}</b> 님이{" "}
                  <b className="font-semibold" style={{ color: RARITY_COLOR[w.prize.rarity] ?? RARITY_COLOR.common }}>
                    {w.prize.name}
                  </b>{" "}
                  당첨!
                </span>
                <span className="ml-auto text-xs text-ink-500">
                  {w.createdAt.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
