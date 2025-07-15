import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreatePortfolioForm } from "@/components/portfolio-form";
import { Combobox } from "@/components/ui/combobox";
import { useEffect, useState } from "react";

async function updatePreferredCurrency(currency: string) {
  await fetch("/api/user/currency", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferredCurrency: currency }),
  });
}

async function fetchUserPreferredCurrency(): Promise<string> {
  const res = await fetch("/api/user/me");
  if (!res.ok) return "USD";
  const data = await res.json();
  return data.preferredCurrency || "USD";
}

export function SiteHeader() {
  const [currency, setCurrency] = useState("USD");
  const currencies = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];

  useEffect(() => {
    fetchUserPreferredCurrency().then(setCurrency);
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await updatePreferredCurrency(newCurrency);
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium tracking-tight text-2xl text-primary drop-shadow-sm">
          Wealth Dashboard
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="min-w-[120px]">
            <Combobox
              options={currencies}
              value={currency}
              onChange={handleCurrencyChange}
              placeholder="Select currency"
              aria-label="Select currency"
            />
          </div>
          <CreatePortfolioForm />
        </div>
      </div>
    </header>
  );
}
