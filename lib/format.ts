export function formatKrw(n: number | null): string {
  if (n == null) return "-";
  if (n >= 100) return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export function formatMoney(n: number | null, currency: string): string {
  if (n == null) return "-";
  if (currency === "USD") {
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1 ? 2 : 6 })}`;
  }
  return `${formatKrw(n)}원`;
}

export function formatPercent(n: number | null): string {
  if (n == null) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatVolume(n: number | null): string {
  if (n == null) return "-";
  if (n >= 1_0000_0000_0000) return `${(n / 1_0000_0000_0000).toFixed(1)}조`;
  if (n >= 1_0000_0000) return `${Math.round(n / 1_0000_0000).toLocaleString()}억`;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

// 코인판 관례: 당일 글은 시각(HH:MM), 이전 글은 날짜(YYYY.MM.DD)
export function formatPostDate(date: Date): string {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

// 데이터 신선도 표시 — "방금 / n분 전" (ISO 문자열 입력)
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 30) return "방금";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}
