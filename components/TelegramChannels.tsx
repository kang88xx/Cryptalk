"use client";

// 한국 텔레그램 인기 포스팅 — 한 개씩 넘기는 캐러셀(채널+게시글 하이퍼링크). 영역만 우선, 더미 데이터.
// TODO: 실제 채널·게시글 데이터 소스 연동 (현재는 모두 동일 링크로 임시 표시).

import { useCallback, useEffect, useState } from "react";

const TELEGRAM_BLUE = "#229ED9";
const CHANNEL_LINK = "https://t.me/kang_tearoom";

type Post = {
  channel: string; // 채널명
  handle: string; // @핸들
  time: string; // 게시 시각(상대)
  title: string; // 게시글 제목
  excerpt: string; // 본문 미리보기
  views: string; // 조회수
  comments: string; // 댓글수
  forwards: string; // 공유수
  postId: number; // 게시글 ID (더미 링크 구성용)
};

// 더미 데이터 — 채널 링크는 CHANNEL_LINK, 게시글 링크는 CHANNEL_LINK/{postId}
const POSTS: Post[] = [
  { channel: "강프로 찻방", handle: "@kang_tearoom", time: "2시간 전", title: "비트코인 5.8만달러 지지 확인, 단기 반등 시나리오 점검", excerpt: "거래량 동반 여부가 관건. 이탈 시 5.6만 지지선까지 열어둬야 합니다.", views: "12.4K", comments: "320", forwards: "180", postId: 1487 },
  { channel: "코인 새벽시황", handle: "@kang_tearoom", time: "4시간 전", title: "美 증시 급락에 알트 동반 조정… 관망 구간 권고", excerpt: "나스닥 -0.46%, 위험자산 회피 심리. 현금 비중 관리가 우선.", views: "9.1K", comments: "210", forwards: "95", postId: 982 },
  { channel: "김치프리미엄 알림", handle: "@kang_tearoom", time: "5시간 전", title: "USDT 김프 -1.8% 진입, 역프 확대 주의", excerpt: "국내 매도 우위 신호. 환율 변동성 확대 구간이라 차익거래 유의.", views: "15.2K", comments: "410", forwards: "260", postId: 2231 },
  { channel: "온체인 고래탐지", handle: "@kang_tearoom", time: "6시간 전", title: "거래소로 2,300 BTC 입금 포착, 매도 압력 관찰", excerpt: "대형 지갑 → 바이낸스 이동. 단기 변동성 확대 가능성.", views: "6.3K", comments: "150", forwards: "88", postId: 771 },
  { channel: "신규상장 速報", handle: "@kang_tearoom", time: "8시간 전", title: "바이낸스 신규 상장 공지: 신규 토큰 현물 마켓 추가", excerpt: "상장 직후 변동성 큼. 진입 전 유통량·언락 일정 확인 필수.", views: "21.7K", comments: "540", forwards: "430", postId: 3390 },
  { channel: "디파이 리서치", handle: "@kang_tearoom", time: "10시간 전", title: "신규 LST 프로토콜 에어드랍 파밍 가이드", excerpt: "예치·브릿지 조건 정리. 가스비 대비 기대값 계산 표 포함.", views: "4.8K", comments: "120", forwards: "70", postId: 158 },
];

function TelegramIcon() {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
      style={{ backgroundColor: TELEGRAM_BLUE }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.07-3.01-1.96 1.9c-.22.22-.4.4-.78.4z" />
      </svg>
    </span>
  );
}

export default function TelegramChannels() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = POSTS.length;

  const go = useCallback((n: number) => setIdx(((n % total) + total) % total), [total]);

  // 자동 넘김 (5초) — 호버 시 일시정지
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % total), 5000);
    return () => clearInterval(t);
  }, [paused, total]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-ink-900">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
          한국 텔레그램 인기 포스팅
          <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-500">샘플</span>
        </h2>
        {/* 달력처럼 한 개씩 넘기는 네비게이션 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(idx - 1)}
            aria-label="이전 포스팅"
            className="grid h-7 w-7 place-items-center rounded-full border border-line bg-white text-ink-600 transition-colors hover:bg-paper"
          >
            ‹
          </button>
          <span className="min-w-[2.5rem] text-center font-mono text-[12px] text-ink-500">
            {idx + 1} / {total}
          </span>
          <button
            type="button"
            onClick={() => go(idx + 1)}
            aria-label="다음 포스팅"
            className="grid h-7 w-7 place-items-center rounded-full border border-line bg-white text-ink-600 transition-colors hover:bg-paper"
          >
            ›
          </button>
        </div>
      </div>

      {/* 캐러셀 뷰포트 — 한 개씩 슬라이드 */}
      <div
        className="overflow-hidden rounded-xl border border-line bg-white shadow-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {POSTS.map((p, i) => (
            <article key={i} className="w-full shrink-0 p-4">
              <div className="flex items-center gap-2.5">
                <TelegramIcon />
                <a
                  href={CHANNEL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold text-ink-900 hover:underline">
                    {p.channel}
                  </p>
                  <p className="truncate text-[12px] text-ink-500">
                    {p.handle} · {p.time}
                  </p>
                </a>
                <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                  조회 {p.views}
                </span>
              </div>

              <a
                href={`${CHANNEL_LINK}/${p.postId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 block"
              >
                <p className="text-[15px] font-semibold leading-snug text-ink-900 group-hover:underline">
                  {p.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-600">
                  {p.excerpt}
                </p>
              </a>

              <div className="mt-3 flex items-center gap-4 border-t border-line pt-2.5 text-[11px] text-ink-500">
                <span>👁 {p.views}</span>
                <span>💬 {p.comments}</span>
                <span>🔁 {p.forwards}</span>
                <a
                  href={`${CHANNEL_LINK}/${p.postId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 font-medium"
                  style={{ color: TELEGRAM_BLUE }}
                >
                  게시글 열기 →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 하단 인디케이터 점 */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {POSTS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`${i + 1}번째 포스팅`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-4 bg-ink-700" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
