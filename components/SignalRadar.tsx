import { prisma } from "@/lib/prisma";
import { getSignalRadar, getKrwMarketStats, getTrendLabels } from "@/lib/ticker";
import { getTodayListings } from "@/lib/listings";
import { radarChips, breadthSignal } from "@/lib/signals";
import { formatRelativeTime } from "@/lib/format";
import { upcomingKstRange } from "@/lib/time";
import SignalRadarBoard from "@/components/SignalRadarBoard";
import type { DrawerCoin } from "@/components/CoinDrawer";

// "지금 봐야 할 코인" — 거래대금 상위 코인에 등락·김프·오늘 일정/상장 reason chip을 결합
export default async function SignalRadar() {
  const { startUtc, endUtc } = upcomingKstRange(1); // 오늘(KST)
  const [radar, stats, listings, todayEvents, trend] = await Promise.all([
    getSignalRadar(),
    getKrwMarketStats(),
    getTodayListings(),
    prisma.calendarEvent.findMany({
      where: { date: { gte: startUtc, lt: endUtc } },
      select: { ticker: true },
    }),
    getTrendLabels(),
  ]);

  const eventTickers = new Set(todayEvents.map((e) => e.ticker.toUpperCase()));
  const listingSymbols = new Set(
    listings.listings.map((l) => l.symbol?.toUpperCase()).filter((s): s is string => !!s)
  );

  const items: DrawerCoin[] = radar.coins.slice(0, 10).map((coin) => ({
    coin,
    chips: radarChips(coin, {
      event: eventTickers.has(coin.symbol.toUpperCase()),
      listing: listingSymbols.has(coin.symbol.toUpperCase()),
      trend: trend[coin.symbol]?.label,
    }),
  }));

  const hasBreadth = stats.total > 0;
  const breadth = hasBreadth
    ? { upPct: (stats.up / stats.total) * 100, signal: breadthSignal(stats.upRatio)! }
    : null;

  // 바이낸스 데이터가 실제로 있을 때만 출처에 표기 (다운 시 과장 방지)
  const source = radar.coins.some((c) => c.kimchi != null) ? "업비트·바이낸스" : "업비트";
  const freshness =
    radar.updatedAt === new Date(0).toISOString()
      ? "데이터 없음"
      : `${formatRelativeTime(radar.updatedAt)} · ${source}`;

  return <SignalRadarBoard items={items} breadth={breadth} freshness={freshness} />;
}
