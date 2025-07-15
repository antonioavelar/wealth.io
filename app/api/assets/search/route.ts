import { NextRequest, NextResponse } from "next/server";
import { marketDataProvider } from "@/lib/market-data";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  // Require authentication
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  if (!symbol || symbol.length < 2) {
    return NextResponse.json({ data: [] });
  }
  try {
    const data = await marketDataProvider.searchSymbols(symbol);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}
