"use client";

// d3-force 시뮬레이션이 노드 좌표를 ref(nodesRef/sizeRef)에 보관하고 setTick으로 리렌더를 유발하는
// 명령형 패턴 — 렌더 중 ref 읽기/동기화가 의도적이다. (검수 결과 정확성 이슈 없음)
/* eslint-disable react-hooks/refs */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import { formatRelativeTime } from "@/lib/format";

const EPOCH = new Date(0).toISOString();

type BubbleCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceUsd: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  volume24h: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change1y: number | null;
};

type Period = "1h" | "24h" | "7d" | "30d";
const PERIODS: { key: Period; label: string; field: keyof BubbleCoin }[] = [
  { key: "1h", label: "1H", field: "change1h" },
  { key: "24h", label: "24H", field: "change24h" },
  { key: "7d", label: "7D", field: "change7d" },
  { key: "30d", label: "1M", field: "change30d" },
];

type Node = {
  coin: BubbleCoin;
  change: number;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const COUNT = 100; // 시총 상위 N개(스테이블코인 제외)

// Cobak 관례: 상승=레드 / 하락=블루
function colorFor(change: number): string {
  if (change > 0.05) return "#e5443b"; // 상승: 레드(up)
  if (change < -0.05) return "#2e7ce6"; // 하락: 블루(down)
  return "#878e97"; // 보합: gray-500
}

export default function BubbleMap() {
  const [coins, setCoins] = useState<BubbleCoin[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>("24h");
  const [hover, setHover] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const simRef = useRef<Simulation<Node, undefined> | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // 컨테이너 실제 크기 측정 → 좌표계를 박스에 맞춰 버블이 꽉 차게
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 언마운트 후 setState 방지 플래그
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // 버블 데이터 로드 — 폴링·재시도 공용 (프론트는 내 API만 본다)
  const loadBubbles = useCallback(async () => {
    try {
      const res = await fetch("/api/bubbles");
      if (!res.ok) throw new Error("non-ok");
      const json = await res.json();
      if (!aliveRef.current) return;
      if (Array.isArray(json.coins)) {
        setCoins(json.coins.slice(0, COUNT));
        if (typeof json.updatedAt === "string") setUpdatedAt(json.updatedAt);
        setError(false);
      }
    } catch {
      if (aliveRef.current) setError(true); // 재시도 버튼 표시
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return; // 백그라운드 탭은 폴링 정지
      loadBubbles();
    };
    tick();
    const t = setInterval(tick, 60_000);
    const onVisible = () => {
      if (!document.hidden) loadBubbles();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadBubbles]);

  const field = useMemo(
    () => PERIODS.find((p) => p.key === period)!.field,
    [period]
  );

  // 노드 구성 + 끊임없이 움직이는 force 시뮬레이션 (cryptobubbles 느낌)
  useEffect(() => {
    const { w: W, h: H } = size;
    if (coins.length === 0 || W === 0 || H === 0) return;
    // 모션 최소화 선호 시: 부유 임펄스 없이 자연 감쇠로 정착시킨다(영구 애니메이션 비활성).
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    const valid = coins
      .map((c) => ({ c, change: (c[field] as number | null) ?? null }))
      .filter((x): x is { c: BubbleCoin; change: number } => x.change != null);
    if (valid.length === 0) return;

    // 박스를 ~62% 채우도록 반지름 스케일을 동적으로 계산 (버블이 가득 차 보이게)
    const weights = valid.map((v) => Math.sqrt(Math.abs(v.change) + 0.4));
    const sumW2 = weights.reduce((s, wt) => s + wt * wt, 0);
    const targetArea = 0.62 * W * H;
    const k = Math.sqrt(targetArea / (Math.PI * sumW2));
    const MAX_R = Math.min(W, H) * 0.26;
    const MIN_R = Math.max(8, Math.min(W, H) * 0.035);

    const prev = new Map(nodesRef.current.map((n) => [n.coin.id, n]));
    const nodes: Node[] = valid.map(({ c, change }, i) => {
      const r = Math.max(MIN_R, Math.min(MAX_R, k * weights[i]));
      const old = prev.get(c.id);
      return {
        coin: c,
        change,
        r,
        x: old?.x ?? Math.random() * W,
        y: old?.y ?? Math.random() * H,
        vx: old?.vx ?? (Math.random() - 0.5) * 2,
        vy: old?.vy ?? (Math.random() - 0.5) * 2,
      };
    });
    nodesRef.current = nodes;

    simRef.current?.stop();
    const sim = forceSimulation(nodes)
      .velocityDecay(0.12) // 낮은 마찰 → 계속 떠다님
      .force("charge", forceManyBody().strength(1.5))
      .force("x", forceX(W / 2).strength(0.012))
      .force("y", forceY(H / 2).strength(0.012))
      .force(
        "collide",
        forceCollide<Node>()
          .radius((d) => d.r + 1.5)
          .strength(0.9)
          .iterations(3)
      )
      .alpha(0.35)
      .alphaDecay(reduceMotion ? 0.05 : 0) // 기본: 영구 모션 / 모션 최소화: 자연 감쇠 후 정지
      .on("tick", () => {
        const { w, h } = sizeRef.current;
        for (const n of nodes) {
          // 부유 모션: 매 틱 미세한 랜덤 임펄스 (모션 최소화 시 생략)
          if (!reduceMotion) {
            n.vx += (Math.random() - 0.5) * 0.18;
            n.vy += (Math.random() - 0.5) * 0.18;
          }
          // 벽 충돌 반사 → 박스 안에 가둠
          if (n.x < n.r) {
            n.x = n.r;
            n.vx = Math.abs(n.vx) * 0.6;
          } else if (n.x > w - n.r) {
            n.x = w - n.r;
            n.vx = -Math.abs(n.vx) * 0.6;
          }
          if (n.y < n.r) {
            n.y = n.r;
            n.vy = Math.abs(n.vy) * 0.6;
          } else if (n.y > h - n.r) {
            n.y = h - n.r;
            n.vy = -Math.abs(n.vy) * 0.6;
          }
        }
        setTick((t) => (t + 1) % 1_000_000);
      });
    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [coins, field, size]);

  const nodes = nodesRef.current;
  const { w: W, h: H } = size;
  const hovered = hover ? nodes.find((n) => n.coin.id === hover) ?? null : null;

  return (
    <div className="flex h-full flex-col">
      {/* 기간 토글 — 버블 크기·색의 "기준" */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                period === p.key
                  ? "bg-navy-900 text-white"
                  : "bg-paper2 text-navy-500 hover:bg-navy-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {updatedAt && updatedAt !== EPOCH && (
          <span className="shrink-0 text-[10px] text-ink-400">
            {formatRelativeTime(updatedAt)} · CoinGecko
          </span>
        )}
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden"
        onMouseLeave={() => setHover(null)}
      >
        {W > 0 && H > 0 && (
          <svg width={W} height={H} className="block">
            {nodes.map((n) => (
              <g
                key={n.coin.id}
                transform={`translate(${n.x},${n.y})`}
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${n.coin.name} (${n.coin.symbol}) ${n.change > 0 ? "+" : ""}${n.change.toFixed(1)}%`}
                onMouseEnter={() => setHover(n.coin.id)}
                onFocus={() => setHover(n.coin.id)}
                onClick={() => setHover((h) => (h === n.coin.id ? null : n.coin.id))}
              >
                <circle
                  r={n.r}
                  fill={colorFor(n.change)}
                  fillOpacity={hover === n.coin.id ? 0.3 : 0.16}
                />
                {n.r > 16 &&
                  (() => {
                    const lr = n.r * 0.36; // 로고 반지름 (텍스트와 겹치지 않게 축소)
                    const lcy = -n.r * 0.25; // 로고 중심 y — 심볼 텍스트와 간격 30% 좁힘
                    const clipId = `logo-clip-${n.coin.id}`;
                    return (
                      <>
                        <clipPath id={clipId}>
                          <circle cx={0} cy={lcy} r={lr} />
                        </clipPath>
                        {/* 흰 배경 원 — 사각/투명 로고도 원형으로 보이게 */}
                        <circle cx={0} cy={lcy} r={lr} fill="#fff" />
                        <image
                          href={n.coin.image}
                          x={-lr}
                          y={lcy - lr}
                          width={lr * 2}
                          height={lr * 2}
                          clipPath={`url(#${clipId})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                        {/* 얇은 테두리로 원형 경계 또렷하게 */}
                        <circle
                          cx={0}
                          cy={lcy}
                          r={lr}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={0.75}
                        />
                      </>
                    );
                  })()}
                <text
                  textAnchor="middle"
                  y={n.r > 16 ? n.r * 0.46 : 3}
                  fontSize={Math.max(7, n.r * 0.28)}
                  fontWeight={700}
                  fill={colorFor(n.change)}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {n.coin.symbol}
                </text>
                {n.r > 26 && (
                  <text
                    textAnchor="middle"
                    y={n.r * 0.73}
                    fontSize={Math.max(6, n.r * 0.2)}
                    fill={colorFor(n.change)}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {n.change > 0 ? "+" : ""}
                    {n.change.toFixed(1)}%
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}

        {nodes.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-500">
            버블맵 로딩 중…
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-xs text-ink-500">데이터를 불러오지 못했어요</span>
            <button
              onClick={() => {
                setError(false);
                void loadBubbles();
              }}
              className="rounded bg-navy-900 px-3 py-1 text-[11px] text-white hover:bg-navy-700"
            >
              다시 시도
            </button>
          </div>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg bg-navy-950/90 px-2 py-1.5 text-[11px] text-white shadow-pop"
            style={{
              // 호버한 버블 근처에 띄우되 컨테이너 밖으로 안 나가게 클램핑
              left: Math.min(Math.max(6, hovered.x + 14), Math.max(6, W - 150)),
              top: Math.min(Math.max(6, hovered.y + 14), Math.max(6, H - 74)),
            }}
          >
            <div className="font-semibold">
              {hovered.coin.name} ({hovered.coin.symbol})
            </div>
            <div className="text-navy-100">시총 #{hovered.coin.marketCapRank ?? "-"}</div>
            <div className="text-navy-100">
              ${hovered.coin.priceUsd?.toLocaleString(undefined, { maximumFractionDigits: 6 }) ?? "-"}
            </div>
            <div style={{ color: hovered.change >= 0 ? "#fca5a5" : "#a3a8ea" }}>
              {PERIODS.find((p) => p.key === period)!.label}{" "}
              {hovered.change > 0 ? "+" : ""}
              {hovered.change.toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
