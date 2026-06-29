import { prisma } from "@/lib/prisma";

// 캘린더 이벤트 DTO — 서버에서 클라이언트로 넘길 때/JSON 응답 모두 date를 ISO 문자열로 통일.
// (CryptoCalendar 클라이언트 컴포넌트가 date:string 을 기대하므로 Date 직렬화를 한 곳에서 처리.)
export type CalendarEventDTO = {
  id: number;
  date: string; // ISO (UTC)
  isTba: boolean;
  ticker: string;
  title: string;
  description: string;
  category: string;
  groupMain: string;
  groupSub: string;
  sourceUrl: string | null;
};

function toDTO(e: {
  id: number;
  date: Date;
  isTba: boolean;
  ticker: string;
  title: string;
  description: string;
  category: string;
  groupMain: string;
  groupSub: string;
  sourceUrl: string | null;
}): CalendarEventDTO {
  return {
    id: e.id,
    date: e.date.toISOString(),
    isTba: e.isTba,
    ticker: e.ticker,
    title: e.title,
    description: e.description,
    category: e.category,
    groupMain: e.groupMain,
    groupSub: e.groupSub,
    sourceUrl: e.sourceUrl,
  };
}

// 특정 월(UTC)의 이벤트 — 홈 SSR 초기 데이터와 /api/events 응답이 공유한다.
export async function getMonthEvents(year: number, month: number): Promise<CalendarEventDTO[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const rows = await prisma.calendarEvent.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  return rows.map(toDTO);
}
