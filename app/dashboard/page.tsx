"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";

interface DashboardAsset {
  assetSymbol: string;
  assetName: string;
  assetType: string;
  quantity: number;
}

interface DashboardTransaction {
  id: string;
  assetSymbol: string;
  assetName: string;
  assetType: string;
  type: string;
  quantity: number;
  price: number;
  date: string;
}

interface DashboardAssetsResponse {
  assets: DashboardAsset[];
  cagr: number | null;
  twr: number | null;
  portfolios: { id: string; name: string }[];
  transactions: DashboardTransaction[];
}

export default function Page() {
  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [cagr, setCAGR] = useState<number | null>(null);
  const [twr, setTWR] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/dashboard/assets", {
          credentials: "include",
        });
        if (res.status === 401) {
          router.replace(`/login?redirect=/dashboard`);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const data: DashboardAssetsResponse = await res.json();
        setAssets(data.assets);
        setTransactions(data.transactions);
        setCAGR(data.cagr || null);
        setTWR(data.twr || null);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [router]);

  // Calculate amount invested (sum of all buy and deposit transactions minus sells)
  const amountInvested = transactions.reduce((sum, tx) => {
    if (tx.type === "buy" || tx.type === "deposit") {
      return sum + tx.quantity * tx.price;
    } else if (tx.type === "sell" || tx.type === "withdrawal") {
      return sum - tx.quantity * tx.price;
    }
    return sum;
  }, 0);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                assets={assets}
                amountInvested={amountInvested}
                cagr={cagr!}
                twr={twr!}
              />
              {/* Asset Holdings Table */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive
                  assets={assets}
                  transactions={transactions}
                />
              </div>
              <DataTable data={transactions} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
