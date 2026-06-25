// 홈 스트리밍용 스켈레톤 모음.
// 각 비동기 섹션이 로딩되는 동안 "실제 컴포넌트와 같은 크기"의 자리표시를 보여
// 정적 셸이 즉시 그려지게 하고(스트리밍), 콘텐츠 교체 시 레이아웃 밀림(CLS)을 막는다.

// 공통 — 펄스 막대
function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-paper2 ${className}`} />;
}

// 섹션 공통 셸(라이트 헤더 + 흰 본문) — SignalRadar·ListingsStrip·UpcomingEvents 공용
function SectionShell({ minBody }: { minBody: string }) {
  return (
    <section className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <div className="h-4 w-32 rounded bg-line" />
        <div className="h-3 w-16 rounded bg-line" />
      </header>
      <div className={`animate-pulse p-4 ${minBody}`}>
        <div className="flex flex-col gap-2.5">
          <Bar className="h-4 w-2/3" />
          <Bar className="h-4 w-1/2" />
          <Bar className="h-4 w-3/4" />
          <Bar className="h-4 w-2/5" />
        </div>
      </div>
    </section>
  );
}

// ── 레이아웃: 상단 헤더 ──
export function HeaderSkeleton() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-[58px] max-w-6xl items-center gap-3 px-4">
        <div className="h-7 w-28 animate-pulse rounded bg-paper2" />
        <div className="ml-auto hidden gap-4 sm:flex">
          <Bar className="h-4 w-12 animate-pulse" />
          <Bar className="h-4 w-12 animate-pulse" />
          <Bar className="h-4 w-12 animate-pulse" />
        </div>
      </div>
    </header>
  );
}

// ── 레이아웃: 마켓바 ──
export function MarketBarSkeleton() {
  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex h-[44px] max-w-6xl items-center gap-2 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse rounded bg-paper2" />
        ))}
      </div>
    </div>
  );
}

// ── 홈: 3카드(시세·도미넌스/환율·공포탐욕) ──
export function MarketCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="flex min-h-[340px] flex-col rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
            <div className="h-4 w-28 rounded bg-line" />
            <div className="h-3 w-16 rounded bg-line" />
          </header>
          <div className="flex flex-1 animate-pulse flex-col gap-3 p-5">
            <Bar className="h-8 w-32" />
            <Bar className="h-3 w-40" />
            <div className="my-2 h-px bg-line" />
            <Bar className="h-5 w-3/4" />
            <Bar className="mt-auto h-20 w-full" />
          </div>
        </section>
      ))}
    </div>
  );
}

// ── 홈: 지금 봐야 할 코인(시그널 레이더) ──
export function SignalRadarSkeleton() {
  return <SectionShell minBody="min-h-[180px]" />;
}

// ── 홈: 오늘 신규 상장 예정(스트립) ──
export function ListingsStripSkeleton() {
  return (
    <section className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <div className="h-4 w-40 rounded bg-line" />
      </header>
      <div className="flex min-h-[52px] animate-pulse flex-wrap gap-2 px-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-40 rounded bg-paper2" />
        ))}
      </div>
    </section>
  );
}

// ── 홈: 다가오는 일정 ──
export function UpcomingEventsSkeleton() {
  return <SectionShell minBody="min-h-[200px]" />;
}

// ── 홈: 하단 게시판 영역(자유게시판 + 분석/인기글) ──
export function HomeBoardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <SectionShell minBody="min-h-[360px]" />
      <div className="flex flex-col gap-6">
        <SectionShell minBody="min-h-[160px]" />
        <SectionShell minBody="min-h-[160px]" />
      </div>
    </div>
  );
}
