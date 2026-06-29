import { Suspense } from "react";
import SignalRadar from "@/components/SignalRadar";
import ListingsStrip from "@/components/ListingsStrip";
import UpcomingEvents from "@/components/UpcomingEvents";
import HomeBoards from "@/components/HomeBoards";
import CryptoCalendar from "@/components/CryptoCalendar";
import TelegramChannels from "@/components/TelegramChannels";
import { getMonthEvents } from "@/lib/calendar";
import {
  SignalRadarSkeleton,
  ListingsStripSkeleton,
  UpcomingEventsSkeleton,
  HomeBoardsSkeleton,
} from "@/components/Skeletons";

export const dynamic = "force-dynamic";

// 캘린더 이벤트는 빠른 로컬 DB 조회라 셸에서 바로 await(SSR)해 초기 스피너를 없앤다.
// 느린 외부 데이터(상장 스크래핑·시그널 레이더 등)는 각자의 Suspense 경계에서 독립
// 스트리밍되어, 가장 느린 데이터가 화면 전체를 막지 않는다.
export default async function Home() {
  // 캘린더는 UTC 통상일 기준으로 이벤트를 배치하므로 초기 달도 UTC 기준으로 잡는다.
  const now = new Date();
  const calYear = now.getUTCFullYear();
  const calMonth = now.getUTCMonth() + 1;
  // 현재 달 이벤트를 SSR로 미리 넘겨 초기 스피너·재요청을 없앤다(LCP·SEO 개선).
  const initialEvents = await getMonthEvents(calYear, calMonth);
  return (
    <div className="flex flex-col gap-6">
      {/* 신규 상장·상폐 정보 — 맨 위 */}
      <Suspense fallback={<ListingsStripSkeleton />}>
        <ListingsStrip />
      </Suspense>
      {/* 크립토 캘린더 — 신규 상장 바로 아래 (제목은 캘린더 자체 헤더 사용) */}
      <CryptoCalendar initialYear={calYear} initialMonth={calMonth} initialEvents={initialEvents} />
      {/* 인게이지먼트 높은 한국 텔레그램 채널 — 캘린더 아래 */}
      <TelegramChannels />
      <Suspense fallback={<SignalRadarSkeleton />}>
        <SignalRadar />
      </Suspense>
      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingEvents />
      </Suspense>
      <Suspense fallback={<HomeBoardsSkeleton />}>
        <HomeBoards />
      </Suspense>
    </div>
  );
}
