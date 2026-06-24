import {
  MarketCardsSkeleton,
  SignalRadarSkeleton,
  ListingsStripSkeleton,
  UpcomingEventsSkeleton,
  HomeBoardsSkeleton,
} from "@/components/Skeletons";

// 홈으로 진입/이동 시 즉시 표시되는 풀페이지 스켈레톤(프리페치되어 즉각 노출).
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <MarketCardsSkeleton />
      <SignalRadarSkeleton />
      <ListingsStripSkeleton />
      <UpcomingEventsSkeleton />
      <HomeBoardsSkeleton />
    </div>
  );
}
