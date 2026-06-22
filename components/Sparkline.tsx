export default function Sparkline({
  values,
  width = 280,
  height = 56,
  stroke = "#636DDB",
  baseline,
  accentRing,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  baseline?: number; // 기준선 (예: 김프 0%)
  accentRing?: string; // 끝점 강조 링 색 (예: 앰버)
}) {
  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-ink-500"
        style={{ width, height }}
      >
        데이터 수집 중...
      </div>
    );
  }

  const pad = 4;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (baseline != null) {
    min = Math.min(min, baseline);
    max = Math.max(max, baseline);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} className="block">
      {baseline != null && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="#A0A6BB"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={accentRing ? 1.4 : 1.2} />
      {accentRing && (
        <>
          {/* 정적 링 (항상 보이는 노란 강조) */}
          <circle
            cx={x(values.length - 1)}
            cy={y(values[values.length - 1])}
            r="5"
            fill="none"
            stroke={accentRing}
            strokeWidth="1.6"
            opacity="0.55"
          />
          {/* 펄스 링 — 확장하며 사라지는 모션 (동시접속 점과 동일 톤) */}
          <circle
            cx={x(values.length - 1)}
            cy={y(values[values.length - 1])}
            r="5"
            fill="none"
            stroke={accentRing}
            strokeWidth="1.8"
          >
            <animate attributeName="r" values="4;11" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;0" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r={accentRing ? "3" : "2.5"}
        fill={stroke}
      />
    </svg>
  );
}
