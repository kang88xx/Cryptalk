"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  userId: string;
  nickname: string;
  level: number;
  content: string;
  createdAt: string;
};

// 아직 서버 저장 전인 낙관적 메시지 (내가 방금 보낸 것)
type Pending = {
  tempKey: string;
  content: string;
  createdAt: string;
  status: "sending" | "failed";
  note?: string; // 실패 사유 (제재 메시지 등)
};

const POLL_MS = 3000; // 폴링 주기

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtCooldown(sec: number): string {
  if (sec >= 3600) return `${Math.ceil(sec / 3600)}시간`;
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}분 ${s}초` : `${m}분`;
  }
  return `${sec}초`;
}

export default function ChatRoom({
  currentUserId,
  isLoggedIn,
}: {
  currentUserId: string | null;
  isLoggedIn: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [cooldown, setCooldown] = useState(0); // 제재 남은 초 (>0이면 입력 잠금)

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const atBottomRef = useRef(true); // 사용자가 맨 아래를 보고 있는지
  const tempSeq = useRef(0);

  // 확정 메시지 병합 (id 중복 제거 — 폴링 결과가 겹칠 수 있음)
  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh].sort((a, b) => a.id - b.id);
      lastIdRef.current = next[next.length - 1].id;
      return next;
    });
  }, []);

  // 최초 로드 + 폴링
  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const after = lastIdRef.current;
        const url = after ? `/api/chat/messages?after=${after}` : "/api/chat/messages";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (!alive) return;
        merge(data.messages);
      } catch {
        // 일시적 네트워크 오류는 다음 폴링에서 회복
      } finally {
        if (alive) setLoaded(true);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [merge]);

  // 맨 아래를 보고 있을 때만 새 메시지에 맞춰 자동 스크롤
  useEffect(() => {
    if (atBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, pending]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // 제재 카운트다운 — 1초마다 감소, 0이 되면 입력 잠금 해제
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // 서버 전송 — 성공 시 낙관적 항목 제거 후 확정 메시지로 교체, 실패 시 failed 표시
  const deliver = useCallback(
    async (content: string, tempKey: string) => {
      try {
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
            retryAfterSec?: number;
          };
          // 제재(429)면 남은 시간만큼 입력 잠금 + 카운트다운
          if (res.status === 429 && err.retryAfterSec) {
            setCooldown(err.retryAfterSec);
          }
          const note = err.error ?? "전송에 실패했습니다.";
          setPending((prev) =>
            prev.map((p) => (p.tempKey === tempKey ? { ...p, status: "failed", note } : p)),
          );
          return;
        }
        const data = (await res.json()) as { message: ChatMessage };
        merge([data.message]);
        setPending((prev) => prev.filter((p) => p.tempKey !== tempKey));
      } catch {
        setPending((prev) =>
          prev.map((p) =>
            p.tempKey === tempKey
              ? { ...p, status: "failed", note: "전송에 실패했습니다. 네트워크를 확인해 주세요." }
              : p,
          ),
        );
      }
    },
    [merge],
  );

  function send() {
    const content = draft.trim();
    if (!content || cooldown > 0) return;
    const tempKey = `t${tempSeq.current++}`;
    setDraft("");
    atBottomRef.current = true; // 내가 보냈으면 맨 아래로
    setPending((prev) => [
      ...prev,
      { tempKey, content, createdAt: new Date().toISOString(), status: "sending" },
    ]);
    deliver(content, tempKey);
  }

  function retry(p: Pending) {
    if (cooldown > 0) return;
    setPending((prev) =>
      prev.map((x) => (x.tempKey === p.tempKey ? { ...x, status: "sending", note: undefined } : x)),
    );
    deliver(p.content, p.tempKey);
  }

  const empty = loaded && messages.length === 0 && pending.length === 0;

  return (
    <div className="flex h-[70vh] flex-col border border-line bg-white">
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {!loaded ? (
          <p className="py-10 text-center text-sm text-ink-500">불러오는 중…</p>
        ) : empty ? (
          <p className="py-10 text-center text-sm text-ink-500">
            아직 메시지가 없어요. 첫 메시지를 남겨보세요!
          </p>
        ) : (
          <>
            {messages.map((m) => {
              const mine = currentUserId != null && m.userId === currentUserId;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && (
                    <span className="mb-0.5 px-1 text-xs text-ink-500">
                      <b className="font-semibold text-navy-900">{m.nickname}</b>
                      <span className="ml-1 font-mono text-[10px] text-ink-500">Lv{m.level}</span>
                    </span>
                  )}
                  <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                    <span
                      className={`max-w-[78%] whitespace-pre-wrap break-words px-3 py-1.5 text-sm ${
                        mine ? "bg-navy-900 text-white" : "bg-paper text-ink-900"
                      }`}
                    >
                      {m.content}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-500">
                      {timeLabel(m.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 낙관적(전송 중·실패) 메시지 — 항상 내 메시지, 우측 정렬 */}
            {pending.map((p) => (
              <div key={p.tempKey} className="flex flex-col items-end">
                <div className="flex flex-row-reverse items-end gap-1.5">
                  <span
                    className={`max-w-[78%] whitespace-pre-wrap break-words px-3 py-1.5 text-sm text-white ${
                      p.status === "failed" ? "bg-red-500" : "bg-navy-900 opacity-60"
                    }`}
                  >
                    {p.content}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-500">
                    {p.status === "failed" ? "" : timeLabel(p.createdAt)}
                  </span>
                </div>
                {p.status === "failed" && (
                  <span className="mt-0.5 max-w-[78%] px-1 text-right text-[11px] text-red-600">
                    {p.note ?? "전송 실패"}{" "}
                    {cooldown === 0 && (
                      <button onClick={() => retry(p)} className="font-semibold underline">
                        다시 시도
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-line p-3">
        {isLoggedIn ? (
          <div className="flex flex-col gap-1.5">
            {cooldown > 0 && (
              <p className="text-center text-xs text-red-600">
                도배 방지로 채팅이 제한되었습니다 · {fmtCooldown(cooldown)} 후 가능
              </p>
            )}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={cooldown > 0}
                maxLength={500}
                placeholder={cooldown > 0 ? `${fmtCooldown(cooldown)} 후 채팅 가능` : "메시지를 입력하세요"}
                className="flex-1 border border-navy-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-navy-300 focus:border-navy-700 focus:outline-none disabled:bg-paper disabled:text-ink-500"
              />
              <button
                onClick={send}
                disabled={draft.trim().length === 0 || cooldown > 0}
                className="shrink-0 bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-amber-400 disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-ink-500">
            채팅에 참여하려면{" "}
            <a href="/login" className="font-semibold text-navy-900 underline">
              로그인
            </a>
            이 필요해요.
          </p>
        )}
      </div>
    </div>
  );
}
