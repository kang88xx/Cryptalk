// 랜덤박스 공용 상수 — "use server"(lib/actions) 밖에 둬서 서버/클라이언트 양쪽에서 import 가능

// 박스 1회 오픈 비용 (포인트). 게시글 5P·출석 10P 기준
export const BOX_COST = 100;

export const RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

// 등급별 색·라벨 (globals 토큰 팔레트)
export const RARITY_META: Record<string, { label: string; color: string }> = {
  common: { label: "커먼", color: "#a0a6bb" }, // navy-300
  rare: { label: "레어", color: "#636ddb" }, // indigo-500
  epic: { label: "에픽", color: "#efc540" }, // amber-500
  legendary: { label: "레전더리", color: "#dc2626" }, // red
};

export function rarityMeta(r: string) {
  return RARITY_META[r] ?? RARITY_META.common;
}
