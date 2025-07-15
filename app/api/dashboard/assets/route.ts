import { NextRequest, NextResponse } from "next/server";
import { AppDataSource } from "@/lib/typeorm";
import { Transaction } from "@/entities/Transaction";
import { Portfolio } from "@/entities/Portfolio";
import { requireAuth } from "@/lib/requireAuth";
import { In } from "typeorm";
import { MarketHistoricalPrice } from "../../../../lib/market-data/types";
import { marketDataProvider } from "../../../../lib/market-data";
import { User } from "@/entities/User";

export type DashboardAsset = {
  assetSymbol: string;
  assetName: string;
  assetType: string;
  assetCurrency: string;
  quantity: number;
  historicalPrices: MarketHistoricalPrice[];
  value: { amount: number; currency: string }; // Changed value property
  totalInvested: number; // Added total invested per asset
};

export type DashboardTransaction = {
  id: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  type: string;
  quantity: number;
  price: number;
  date: string;
};

export type DashboardPortfolio = {
  id: string;
  name: string;
};

export type PortfolioPerformancePoint = {
  date: string;
  value: number;
};

export type DashboardAssetsResponse = {
  assets: DashboardAsset[];
  portfolios: DashboardPortfolio[];
  transactions: DashboardTransaction[];
  performance: PortfolioPerformancePoint[];
  twr: number | null;
  cagr: number | null;
};

export async function GET(req: NextRequest) {
  const { userId } = await requireAuth(req);
  try {
    if (!userId) {
      return NextResponse.json({
        assets: [],
        portfolios: [],
        transactions: [],
      });
    }
    const portfolioRepo = AppDataSource.getRepository(Portfolio);
    const txRepo = AppDataSource.getRepository(Transaction);
    const userRepo = AppDataSource.getRepository(User);

    // Get all portfolios for the user (include id, name)
    const portfolios = await portfolioRepo.find({
      select: ["id", "name"],
      where: { userId },
    });
    const portfolioIds = portfolios.map((p) => p.id);
    if (portfolioIds.length === 0) {
      return NextResponse.json({
        assets: [],
        portfolios: [],
        transactions: [],
      });
    }

    // Fetch all transactions for these portfolios
    const transactions = await txRepo.find({
      where: { portfolioId: In(portfolioIds) },
    });

    // Aggregate holdings by assetSymbol
    const holdings: Record<string, DashboardAsset> = {};
    // Track total invested per asset
    const totalInvestedByAsset: Record<string, number> = {};
    const txHistory: DashboardTransaction[] = [];
    for (const tx of transactions) {
      if (!holdings[tx.assetSymbol]) {
        holdings[tx.assetSymbol] = {
          assetSymbol: tx.assetSymbol,
          assetName: tx.assetName,
          assetType: tx.assetType,
          assetCurrency: tx.currency,
          quantity: 0,
          historicalPrices: [],
          value: { amount: 0, currency: tx.currency }, // Initialize value
          totalInvested: 0,
        };
        totalInvestedByAsset[tx.assetSymbol] = 0;
      }
      holdings[tx.assetSymbol].quantity +=
        tx.type === "buy" || tx.type === "deposit" ? tx.quantity : -tx.quantity;
      // Track total invested (only for buy and deposit transactions)
      if (tx.type === "buy" || tx.type === "deposit") {
        totalInvestedByAsset[tx.assetSymbol] += tx.price * tx.quantity;
      }
      txHistory.push({
        id: tx.id,
        assetSymbol: tx.assetSymbol,
        assetName: tx.assetName,
        assetType: tx.assetType,
        type: tx.type,
        quantity: tx.quantity,
        price: tx.price,
        date: tx.date.toISOString().split("T")[0],
      });
    }
    // Filter out assets with zero or negative quantity
    const filtered: DashboardAsset[] = Object.values(holdings)
      .filter((h) => h.quantity > 0)
      .map((asset) => ({
        ...asset,
        totalInvested: totalInvestedByAsset[asset.assetSymbol] || 0,
      }));
    // Find the oldest transaction date for each asset
    const oldestTxDateByAsset: Record<string, string> = {};
    for (const tx of transactions) {
      const txDate = tx.date.toISOString().split("T")[0];
      if (
        !oldestTxDateByAsset[tx.assetSymbol] ||
        txDate < oldestTxDateByAsset[tx.assetSymbol]
      ) {
        oldestTxDateByAsset[tx.assetSymbol] = txDate;
      }
    }

    // Fetch user preferred currency
    const user = await userRepo.findOne({ where: { id: userId } });
    const userCurrency = user?.preferredCurrency;

    // Fetch historical prices for each asset (in parallel), starting from oldest transaction date
    await Promise.all(
      filtered.map(async (asset) => {
        const fromDate = oldestTxDateByAsset[asset.assetSymbol];
        try {
          asset.historicalPrices = await marketDataProvider.getHistoricalPrices(
            asset.assetSymbol,
            { startDate: fromDate }
          );

          if (userCurrency && asset.assetCurrency !== userCurrency) {
            asset.historicalPrices = await Promise.all(
              asset.historicalPrices.map(async (price) => {
                // Convert historical prices to user preferred currency
                const rate = await marketDataProvider.getExchangeRate(
                  asset.assetCurrency,
                  userCurrency,
                  price.datetime
                );

                if (rate && rate > 0) {
                  return {
                    ...price,
                    open: price.open * rate,
                    high: price.high * rate,
                    low: price.low * rate,
                    close: price.close * rate,
                  };
                } else {
                  return price;
                }
              })
            );
          }

          // Add value property: { amount, currency } (always in user preferred currency)
          if (asset.historicalPrices.length > 0) {
            const latestPrice =
              asset.historicalPrices[asset.historicalPrices.length - 1];
            let closePrice = latestPrice.close;
            // If asset currency is not user currency, convert using latest price date
            if (userCurrency && asset.assetCurrency !== userCurrency) {
              const rate = await marketDataProvider.getExchangeRate(
                asset.assetCurrency,
                userCurrency,
                latestPrice.datetime
              );
              if (rate && rate > 0) {
                closePrice = closePrice * rate;
              }
            }
            asset.value = {
              amount: asset.quantity * closePrice,
              currency: userCurrency || asset.assetCurrency,
            };
          } else {
            asset.value = {
              amount: 0,
              currency: userCurrency || asset.assetCurrency,
            };
          }
        } catch {
          asset.historicalPrices = [];
          asset.value = { amount: 0, currency: asset.assetCurrency };
        }
      })
    );

    // Compute portfolio performance over time
    // 1. Collect all unique dates from all assets' historicalPrices
    const dateSet = new Set<string>();
    filtered.forEach((asset) => {
      asset.historicalPrices.forEach((price) => {
        dateSet.add(price.datetime.split("T")[0]);
      });
    });
    const allDates = Array.from(dateSet).sort();

    // 2. For each date, sum value of all assets (quantity * close price)
    const performance: PortfolioPerformancePoint[] = allDates.map((date) => {
      let value = 0;
      filtered.forEach((asset) => {
        // Find the price for this date
        const price = asset.historicalPrices.find((p) =>
          p.datetime.startsWith(date)
        );
        if (price) {
          value += asset.quantity * price.close;
        }
      });
      return { date, value };
    });

    // Improved TWR (Time-Weighted Return) and CAGR calculation
    let twr: number | null = null;
    let cagr: number | null = null;
    if (performance.length > 1) {
      // Gather all cash flow dates and amounts
      const cashFlows = txHistory
        .filter((tx) =>
          ["buy", "deposit", "sell", "withdraw", "withdrawal"].includes(tx.type)
        )
        .map((tx) => ({
          date: tx.date,
          amount:
            tx.type === "buy" || tx.type === "deposit"
              ? -tx.price * tx.quantity
              : tx.price * tx.quantity,
        }));
      // Sort by date ascending
      cashFlows.sort((a, b) => (a.date < b.date ? -1 : 1));

      // Build sub-periods at each cash flow date
      let product = 1;
      let prevValue = performance[0].value;
      let prevDate = performance[0].date;
      let cfIdx = 0;
      for (let i = 1; i < performance.length; i++) {
        const currDate = performance[i].date;
        const currValue = performance[i].value;
        // Find all cash flows between prevDate (exclusive) and currDate (inclusive)
        let netFlow = 0;
        while (
          cfIdx < cashFlows.length &&
          cashFlows[cfIdx].date > prevDate &&
          cashFlows[cfIdx].date <= currDate
        ) {
          netFlow += cashFlows[cfIdx].amount;
          cfIdx++;
        }
        // Only calculate sub-period return if prevValue is not zero
        if (prevValue !== 0) {
          const r = (currValue - netFlow - prevValue) / prevValue;
          product *= 1 + r;
        }
        prevValue = currValue;
        prevDate = currDate;
      }
      twr = product - 1;

      // Improved CAGR: Use only net invested and final value, and precise year fraction
      const first = performance[0];
      const last = performance[performance.length - 1];
      const startDate = new Date(first.date);
      const endDate = new Date(last.date);
      const years =
        (endDate.getTime() - startDate.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000);
      // For CAGR, use the sum of all net cash flows as initial investment if available
      let netInvested = 0;
      for (const cf of cashFlows) {
        netInvested += cf.amount;
      }
      // If netInvested is negative (i.e., net inflow), use abs value as principal
      const principal =
        Math.abs(netInvested) > 0 ? Math.abs(netInvested) : first.value;
      if (principal > 0 && years > 0) {
        cagr = Math.pow(last.value / principal, 1 / years) - 1;
      }
    }

    return NextResponse.json({
      assets: filtered,
      portfolios,
      transactions: txHistory,
      performance,
      twr: parseFloat(twr.toFixed(2)),
      cagr: parseFloat(cagr?.toFixed(2)),
    } satisfies DashboardAssetsResponse);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
