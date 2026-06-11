export function formatKrw(n: number | null): string {
  if (n == null) return "-";
  if (n >= 100) return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
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

export function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}
