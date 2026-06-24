import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/actions";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

// 어드민 전 구역 권한 게이트 일원화 — 운영진(Lv10+)만. 각 페이지는 게이트를 중복하지 않는다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/");

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Admin</p>
      <AdminNav />
      {children}
    </div>
  );
}
