import CryptoCalendar from "@/components/CryptoCalendar";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const now = new Date();
  return (
    <div>
      <p className="eyebrow">Crypto Calendar</p>
      <h1 className="mb-4 text-lg font-semibold text-navy-900">크립토 캘린더</h1>
      <CryptoCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
    </div>
  );
}
