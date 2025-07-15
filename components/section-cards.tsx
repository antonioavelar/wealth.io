import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type Asset = {
  value: { amount: number; currency: string };
  totalInvested?: number;
  // ...other asset fields
};

function formatCurrency(value: number, currency: string) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function SectionCards({
  assets,
  cagr,
  twr,
}: {
  assets?: Asset[];
  cagr?: number;
  twr?: number;
}) {
  const { amount, currency, totalInvested } = useMemo(() => {
    if (!assets || assets.length === 0)
      return { amount: 0, currency: "USD", totalInvested: 0 };
    const currency = assets[0].value?.currency || "USD";
    const amount = assets.reduce(
      (sum: number, asset: Asset) => sum + (asset.value?.amount || 0),
      0
    );
    const totalInvested = assets.reduce(
      (sum: number, asset: Asset) => sum + (asset.totalInvested || 0),
      0
    );
    return { amount, currency, totalInvested };
  }, [assets]);

  // Calculate price difference (return as percent)
  const priceDiff = useMemo(() => {
    if (!totalInvested || totalInvested === 0) return 0;
    return ((amount - totalInvested) / totalInvested) * 100;
  }, [amount, totalInvested]);

  // Helper for arrow direction
  const ArrowIcon =
    priceDiff > 0 ? IconTrendingUp : priceDiff < 0 ? IconTrendingDown : null;

  // Badge color: green for positive, red for negative, default for neutral
  let badgeClass = "";
  if (priceDiff > 0) badgeClass = "text-green-600 border-green-600";
  else if (priceDiff < 0) badgeClass = "text-red-600 border-red-600";

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Portfolio Value</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(amount, currency)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={badgeClass}>
              {ArrowIcon && <ArrowIcon />}
              {formatPercent(priceDiff)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" />
          </div>
          {/* ...existing code... */}
          <div className="text-muted-foreground">
            Visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Time-Weighted Return (TWR)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {twr} %
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Measures the compound growth rate of a portfolio, ignoring the
            impact of cash flows (deposits/withdrawals). It isolates the
            performance of the underlying investments.
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Accounts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Compound Annual Growth Rate (CAGR)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {cagr} %
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {typeof cagr === "number" ? (
                cagr > 0 ? (
                  <IconTrendingUp className="text-green-600" />
                ) : cagr < 0 ? (
                  <IconTrendingDown className="text-red-600" />
                ) : null
              ) : null}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Annualized Return shows the geometric average amount of money earned
            by an investment each year over the selected period, as if the
            returns were compounded annually.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
