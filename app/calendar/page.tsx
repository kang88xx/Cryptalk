import CryptoCalendar from "@/components/CryptoCalendar";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const now = new Date();
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-zinc-100">크립토 캘린더</h1>
      <CryptoCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
    </div>
  );
}
