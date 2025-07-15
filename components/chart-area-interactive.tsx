"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MarketHistoricalPrice } from "@/lib/market-data/types";

export const description = "An interactive area chart";

type DashboardAssetWithHistory = {
  assetSymbol: string;
  assetName: string;
  assetType: string;
  quantity: number;
  historicalPrices: MarketHistoricalPrice[];
};

interface ChartAreaInteractiveProps {
  assets?: DashboardAssetWithHistory[];
  transactions?: Array<{
    id: string;
    assetSymbol: string;
    type: string;
    quantity: number;
    price: number;
    date: string;
  }>;
}

export function ChartAreaInteractive({
  assets = [],
  transactions = [],
}: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  // Compute all unique dates from all assets' historicalPrices, but only after the first transaction
  const allDates = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const firstTxDate = transactions
      .map((tx) => new Date(tx.date).toISOString().slice(0, 10))
      .sort()[0];

    const dateSet = new Set<string>();
    assets.forEach((asset) => {
      asset.historicalPrices.forEach((h) => {
        if (h.datetime >= firstTxDate) {
          dateSet.add(h.datetime);
        }
      });
    });
    return Array.from(dateSet).sort();
  }, [assets, transactions]);

  // Compute total portfolio value and invested amount for each date
  const portfolioHistory = React.useMemo(() => {
    return allDates.map((date) => {
      let total = 0;
      let invested = 0;
      // Portfolio value as before
      assets.forEach((asset) => {
        const price = asset.historicalPrices.find((h) => h.datetime === date);
        if (price) {
          total += asset.quantity * price.close;
        }
      });
      // Invested: sum of all buy/deposit minus sell/withdrawal up to and including this date
      if (transactions && transactions.length > 0) {
        transactions.forEach((tx) => {
          if (new Date(tx.date).toISOString().slice(0, 10) <= date) {
            if (tx.type === "buy" || tx.type === "deposit") {
              invested += tx.quantity * tx.price;
            } else if (tx.type === "sell" || tx.type === "withdrawal") {
              invested -= tx.quantity * tx.price;
            }
          }
        });
      }
      return {
        date,
        value: total,
        invested: invested === 0 ? null : invested,
      };
    });
  }, [allDates, assets, transactions]);

  // Filter by time range
  const referenceDate =
    allDates.length > 0 ? new Date(allDates[allDates.length - 1]) : new Date();
  let daysToSubtract = 90;
  if (timeRange === "30d") daysToSubtract = 30;
  else if (timeRange === "7d") daysToSubtract = 7;
  else if (timeRange === "1y") daysToSubtract = 365;
  else if (timeRange === "5y") daysToSubtract = 1825;
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() - daysToSubtract);
  const filteredData = portfolioHistory.filter(
    (item) => new Date(item.date) >= startDate
  );

  if (!Array.isArray(assets) || assets.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Total Portfolio Value</CardTitle>
          <CardDescription>No asset data available.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Total Portfolio Value</CardTitle>
          <CardDescription>
            No historical price data available for the selected range.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const timeRanges = [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
    { value: "90d", label: "Last 3 months", days: 90 },
    { value: "1y", label: "Last 1 year", days: 365 },
    { value: "5y", label: "Last 5 years", days: 1825 },
  ];

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Portfolio Value</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the selected range
          </span>
          <span className="@[540px]/card:hidden">Selected range</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            {timeRanges.map((range) => (
              <ToggleGroupItem key={range.value} value={range.value}>
                {range.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {timeRanges.map((range) => (
                <SelectItem
                  key={range.value}
                  value={range.value}
                  className="rounded-lg"
                >
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={{
            value: { label: "Portfolio Value", color: "var(--primary)" },
            invested: { label: "Amount Invested", color: "#3B82F6" },
          }}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--primary)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={1.0} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              stroke="var(--primary)"
              stackId="a"
            />
            <Area
              dataKey="invested"
              type="natural"
              fill="url(#fillInvested)"
              stroke="#3B82F6"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
