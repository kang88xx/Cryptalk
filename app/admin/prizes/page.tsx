import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin, createPrize, updatePrize, deletePrize } from "@/lib/actions";

export const dynamic = "force-dynamic";

const RARITIES = [
  { key: "common", label: "커먼" },
  { key: "rare", label: "레어" },
  { key: "epic", label: "에픽" },
  { key: "legendary", label: "레전더리" },
];
const RARITY_COLOR: Record<string, string> = {
  common: "#a0a6bb",
  rare: "#636ddb",
  epic: "#efc540",
  legendary: "#dc2626",
};

const inputCls =
  "w-full border border-line bg-white px-2 py-1.5 text-sm text-ink-900 focus:border-navy-700 focus:outline-none";
const labelCls = "mb-1 block text-[11px] font-medium text-ink-500";

export default async function AdminPrizesPage() {
  if (!(await isAdmin())) redirect("/");

  const prizes = await prisma.prize.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { wins: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Admin</p>
      <h1 className="mb-1 text-lg font-semibold text-navy-900">랜덤박스 상품 관리</h1>
      <p className="mb-4 text-xs text-ink-500">
        가중치가 클수록 자주 당첨됩니다. 재고를 비우면 무제한, 숫자를 넣으면 한정 수량입니다.
      </p>

      {/* 신규 등록 */}
      <section className="mb-6 border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-navy-900">상품 등록</h2>
        </header>
        <form action={createPrize} className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label className={labelCls}>상품명 *</label>
            <input name="name" required maxLength={80} className={inputCls} placeholder="예: 스타벅스 기프티콘" />
          </div>
          <div>
            <label className={labelCls}>등급</label>
            <select name="rarity" className={inputCls} defaultValue="common">
              {RARITIES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>가중치(확률)</label>
            <input name="weight" type="number" min={1} defaultValue={100} className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className={labelCls}>설명</label>
            <input name="description" maxLength={200} className={inputCls} placeholder="당첨자에게 보여줄 설명 (선택)" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>이미지 URL</label>
            <input name="imageUrl" className={inputCls} placeholder="https://… (선택)" />
          </div>
          <div>
            <label className={labelCls}>재고</label>
            <input name="stock" type="number" min={0} className={inputCls} placeholder="무제한" />
          </div>
          <div>
            <label className={labelCls}>정렬</label>
            <input name="sortOrder" type="number" defaultValue={0} className={inputCls} />
          </div>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
            <label className="flex items-center gap-1.5 text-sm text-ink-900">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
              활성
            </label>
            <button
              type="submit"
              className="ml-auto bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700"
            >
              + 등록
            </button>
          </div>
        </form>
      </section>

      {/* 등록된 상품 목록 */}
      <section className="border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-navy-900">등록된 상품 ({prizes.length})</h2>
        </header>
        {prizes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">아직 등록된 상품이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {prizes.map((p) => (
              <li key={p.id} className="p-4">
                <form
                  action={updatePrize.bind(null, p.id)}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: RARITY_COLOR[p.rarity] ?? RARITY_COLOR.common }}
                    />
                    <input name="name" defaultValue={p.name} required maxLength={80} className={inputCls} />
                  </div>
                  <div>
                    <select name="rarity" className={inputCls} defaultValue={p.rarity}>
                      {RARITIES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input name="weight" type="number" min={1} defaultValue={p.weight} className={inputCls} title="가중치" />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <input
                      name="description"
                      defaultValue={p.description ?? ""}
                      maxLength={200}
                      className={inputCls}
                      placeholder="설명"
                    />
                  </div>
                  <div className="col-span-2">
                    <input name="imageUrl" defaultValue={p.imageUrl ?? ""} className={inputCls} placeholder="이미지 URL" />
                  </div>
                  <div>
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      defaultValue={p.stock ?? ""}
                      className={inputCls}
                      placeholder="무제한"
                      title="재고"
                    />
                  </div>
                  <div>
                    <input name="sortOrder" type="number" defaultValue={p.sortOrder} className={inputCls} title="정렬" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
                    <label className="flex items-center gap-1.5 text-sm text-ink-900">
                      <input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4" />
                      활성
                    </label>
                    <span className="text-xs text-ink-500">당첨 {p._count.wins}회</span>
                    <button
                      type="submit"
                      className="ml-auto border border-navy-300 px-4 py-1.5 text-sm font-medium text-navy-700 hover:border-navy-900 hover:text-navy-900"
                    >
                      저장
                    </button>
                  </div>
                </form>
                <form action={deletePrize.bind(null, p.id)} className="mt-2 text-right">
                  <button
                    type="submit"
                    className="text-xs text-red-600 underline-offset-2 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
