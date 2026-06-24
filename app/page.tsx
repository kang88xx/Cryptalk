import { Suspense } from "react";
import MarketCards from "@/components/MarketCards";
import SignalRadar from "@/components/SignalRadar";
import ListingsStrip from "@/components/ListingsStrip";
import UpcomingEvents from "@/components/UpcomingEvents";
import HomeBoards from "@/components/HomeBoards";
import {
  MarketCardsSkeleton,
  SignalRadarSkeleton,
  ListingsStripSkeleton,
  UpcomingEventsSkeleton,
  HomeBoardsSkeleton,
} from "@/components/Skeletons";

export const dynamic = "force-dynamic";

// 페이지 함수는 await 없이 즉시 정적 셸을 반환한다. 각 비동기 섹션은 자신의 Suspense
// 경계 안에서 독립적으로 스트리밍되어, 가장 느린 데이터가 화면 전체를 막지 않는다.
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<MarketCardsSkeleton />}>
        <MarketCards />
      </Suspense>
      <Suspense fallback={<SignalRadarSkeleton />}>
        <SignalRadar />
      </Suspense>
      <Suspense fallback={<ListingsStripSkeleton />}>
        <ListingsStrip />
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
