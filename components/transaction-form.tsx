"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import debounce from "lodash.debounce";

const TRANSACTION_TYPES = [
  { label: "Buy", value: "buy" },
  { label: "Sell", value: "sell" },
  { label: "Deposit", value: "deposit" },
  { label: "Withdraw", value: "withdraw" },
];

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  buy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sell: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  deposit: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  withdraw:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function CreateTransactionForm() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Transaction
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Transaction</DialogTitle>
            <DialogDescription>
              Select a portfolio and enter the details below to add a new
              transaction.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Transaction
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create Transaction</DrawerTitle>
          <DrawerDescription>
            Select a portfolio and enter the details below to add a new
            transaction.
          </DrawerDescription>
        </DrawerHeader>
        <TransactionForm className="px-4" onSuccess={() => setOpen(false)} />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function TransactionForm({
  className,
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const [portfolios, setPortfolios] = React.useState<
    { id: string; name: string }[]
  >([]);
  const [selectedPortfolio, setSelectedPortfolio] = React.useState<string>("");
  const [loadingPortfolios, setLoadingPortfolios] = React.useState(true);
  const [type, setType] = React.useState(TRANSACTION_TYPES[0].value);
  const [asset, setAsset] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [date, setDate] = React.useState(() => {
    const now = new Date();
    // Format as yyyy-MM-dd for date only
    return now.toISOString().slice(0, 10);
  });
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [assetQuery, setAssetQuery] = React.useState("");
  const [assetOptions, setAssetOptions] = React.useState<
    {
      label: string;
      value: string;
      instrument_type: "stock" | "crypto" | "cash" | "other";
      name: string;
      currency?: string; // Add currency property
    }[]
  >([]);
  const [assetSelected, setAssetSelected] = React.useState(false);
  const [currency, setCurrency] = React.useState<string>("");

  React.useEffect(() => {
    async function fetchPortfolios() {
      setLoadingPortfolios(true);
      try {
        const res = await fetch("/api/dashboard/assets", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch portfolios");
        const data = await res.json();
        setPortfolios(data.portfolios || []);
      } catch (err) {
        setPortfolios([]);
      } finally {
        setLoadingPortfolios(false);
      }
    }
    fetchPortfolios();
  }, []);

  // Fetch asset options from backend with lodash.debounce
  const fetchAssets = React.useCallback(
    debounce(async (query: string, ignore: { current: boolean }) => {
      try {
        const res = await fetch(
          "/api/assets/search?symbol=" + encodeURIComponent(query),
          { credentials: "include" }
        );
        const data = await res.json();
        if (!ignore.current && data.data) {
          setAssetOptions(
            data.data.slice(0, 10).map(
              (item: {
                symbol: string;
                exchange: string;
                name: string;
                instrument_type?: string;
                currency?: string; // Add currency property
              }) => ({
                label: `${item.symbol}.${item.exchange}`,
                value: `${item.symbol}.${item.exchange}`,
                instrument_type: item.instrument_type || "other",
                name: item.name,
                currency: item.currency, // Set currency if available
              })
            )
          );
        }
      } catch {
        if (!ignore.current) setAssetOptions([]);
      }
    }, 400),
    []
  );

  React.useEffect(() => {
    if (assetSelected || !assetQuery || assetQuery.length < 2) {
      setAssetOptions([]);
      return;
    }
    const ignore = { current: false };
    fetchAssets(assetQuery, ignore);
    return () => {
      ignore.current = true;
      fetchAssets.cancel();
    };
  }, [assetQuery, fetchAssets, assetSelected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const selectedAsset = assetOptions.find((opt) => opt.value === asset);
      const res = await fetch(
        `/api/portfolio/${selectedPortfolio}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            transactions: [
              {
                type,
                symbol: selectedAsset?.label.split(".")[0] || "",
                exchange: selectedAsset?.label.split(".")[1] || "",
                instrument_type: selectedAsset?.instrument_type,
                assetName: selectedAsset?.name,
                amount: parseFloat(amount),
                price: parseFloat(price),
                date,
                notes,
                currency: selectedAsset?.currency || currency, // Send currency
              },
            ],
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      setSubmitSuccess(true);
      setAsset("");
      setAmount("");
      setPrice("");
      setDate(() => {
        const now = new Date();
        return now.toISOString().slice(0, 10);
      });
      setNotes("");
      setAssetSelected(false);
      setAssetQuery("");
      setCurrency(""); // Reset currency after submit
      // Do not close the form, allow user to create again
      // if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError((err as Error).message || "Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="grid gap-3">
          <Label htmlFor="portfolio">Portfolio</Label>
          <Combobox
            options={portfolios.map((p) => ({ label: p.name, value: p.id }))}
            value={selectedPortfolio}
            onChange={setSelectedPortfolio}
            placeholder={
              loadingPortfolios ? "Loading..." : "Search portfolio..."
            }
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="type">Type</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                disabled={!selectedPortfolio}
              >
                {(() => {
                  const selected = TRANSACTION_TYPES.find(
                    (t) => t.value === type
                  );
                  return selected ? (
                    <Badge
                      className={`px-1.5 ${
                        TRANSACTION_TYPE_COLORS[selected.value]
                      }`}
                    >
                      {selected.label}
                    </Badge>
                  ) : (
                    "Select type"
                  );
                })()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[150px]">
              {TRANSACTION_TYPES.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  onSelect={() => setType(t.value)}
                  className={type === t.value ? "font-bold" : ""}
                >
                  <Badge
                    className={`px-1.5 ${TRANSACTION_TYPE_COLORS[t.value]}`}
                  >
                    {t.label}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="asset">Asset</Label>
        <Combobox
          options={assetOptions}
          value={asset}
          onChange={(val: string) => {
            setAsset(val);
            setAssetQuery(val);
            setAssetSelected(true);
            // Set currency to the selected asset's currency
            const selected = assetOptions.find((opt) => opt.value === val);
            setCurrency(selected?.currency || "");
          }}
          onQueryChange={(query: string) => {
            setAssetQuery(query);
            setAssetSelected(false);
            setCurrency(""); // Reset currency if user is searching
          }}
          placeholder="Choose a Symbol (e.g. AAPL)"
        />
        {!asset && (
          <span className="text-xs text-red-500 mt-1">
            Please select an asset.
          </span>
        )}
      </div>
      <div className="grid gap-3">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="any"
          placeholder="e.g. 10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          disabled={!selectedPortfolio}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="price">Price</Label>
        <div className="flex items-center gap-2">
          <Input
            id="price"
            type="number"
            step="any"
            placeholder="e.g. 150.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            disabled={!selectedPortfolio}
            style={{ flex: 1 }}
          />
          {currency && (
            <span className="text-sm text-muted-foreground min-w-[40px]">
              {currency}
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="date">Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={!selectedPortfolio}
              onClick={() => setCalendarOpen(true)}
            >
              {date
                ? new Date(date + "T00:00:00").toLocaleDateString()
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto">
            <Calendar
              mode="single"
              selected={date ? new Date(date + "T00:00:00") : undefined}
              onSelect={(selected) => {
                if (selected instanceof Date && !isNaN(selected.getTime())) {
                  const local = new Date(
                    selected.getTime() - selected.getTimezoneOffset() * 60000
                  );
                  setDate(local.toISOString().slice(0, 10));
                  setCalendarOpen(false);
                }
              }}
              className="w-full"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!selectedPortfolio}
        />
      </div>
      {submitError && (
        <div className="flex justify-center">
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded shadow text-sm animate-fade-in flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
              />
            </svg>
            <span>{submitError}</span>
          </div>
        </div>
      )}
      {submitSuccess && (
        <span className="text-green-600 text-xs font-medium">
          Transaction created successfully!
        </span>
      )}
      <Button
        type="submit"
        disabled={submitting || !selectedPortfolio || !asset}
      >
        {submitting ? "Creating..." : "Create Transaction"}
      </Button>
    </form>
  );
}
