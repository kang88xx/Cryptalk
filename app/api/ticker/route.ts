import { NextResponse } from "next/server";
import { getTickers } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getTickers();
  return NextResponse.json(snapshot);
}
