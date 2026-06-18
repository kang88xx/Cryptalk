// 모바일 앱 프로모 — 다운로드 버튼은 출시 전이라 비활성(회색) + "앱스토어 심사중"
const STORES = [
  { label: "App Store", sub: "iOS" },
  { label: "Google Play", sub: "Android" },
];

export default function AppPromo() {
  return (
    <section className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-9 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow mb-1.5">Mobile App</p>
          <h2 className="text-xl font-semibold tracking-tight text-navy-900">
            모바일 앱으로 더 빠르게
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            실시간 시세·김치프리미엄·KRW 시그널을 손안에서. 신규 상장과 주요 일정도 푸시
            알림으로 놓치지 마세요.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {STORES.map((s) => (
              <span
                key={s.label}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-2 border border-line bg-paper2 px-4 py-2.5 text-ink-300 select-none"
              >
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-ink-300">{s.sub}</span>
                  <span className="text-sm font-semibold">{s.label}</span>
                </span>
                <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                  심사중
                </span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-ink-400">앱스토어 심사중 · 출시 예정</p>
        </div>
      </div>
    </section>
  );
}
