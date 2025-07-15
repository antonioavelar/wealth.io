"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

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
import { Combobox } from "@/components/ui/combobox";
import {
  getExchangeMappings,
  mapExchangeTransactions,
  NormalizedTransaction,
} from "@/lib/exchange-mapping";

export function CreatePortfolioForm() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new portfolio.
            </DialogDescription>
          </DialogHeader>
          <PortfolioForm />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Portfolio
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Create Portfolio</DrawerTitle>
          <DrawerDescription>
            Fill in the details below to create a new portfolio.
          </DrawerDescription>
        </DrawerHeader>
        <PortfolioForm className="px-4" />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function PortfolioForm({ className }: React.ComponentProps<"form">) {
  const supportedExchanges = getExchangeMappings().map((ex) => ex.config);
  const [importedTransactions, setImportedTransactions] = React.useState<
    NormalizedTransaction[]
  >([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedExchange, setSelectedExchange] = React.useState<string>("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [rawTransactions, setRawTransactions] = React.useState<
    Record<string, unknown>[]
  >([]);
  const [columnWarning, setColumnWarning] = React.useState<string | null>(null);
  const [portfolioName, setPortfolioName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getExpectedColumns = (exchangeValue: string): string[] => {
    const mapping = getExchangeMappings().find(
      (ex) => ex.config.value === exchangeValue
    );
    return mapping?.requiredColumns || [];
  };

  // Helper: case-insensitive column check
  const hasAllRequiredColumns = (actual: string[], expected: string[]) => {
    const actualLower = actual.map((col) => col.toLowerCase());
    return expected.filter((col) => !actualLower.includes(col.toLowerCase())); // returns missing columns
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setColumnWarning(null);
    setSelectedFile(file);
    setImportedTransactions([]);
    setRawTransactions([]);
    if (!file) return;
    try {
      // Use the new LLM-powered endpoint
      const formData = new FormData();
      formData.append("file", file);
      // You may need to get the portfolio id from props/context or after creation
      // For now, assume a placeholder or get it from the created portfolio
      const portfolioId = "preview"; // Replace with actual id if available
      const res = await fetch(
        `/api/portfolio/${portfolioId}/parse-broker-file`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const { parsed } = await res.json();
      // Try to parse the result as JSON
      let transactions: Record<string, unknown>[] = [];
      try {
        const parsedObj =
          typeof parsed === "string" ? JSON.parse(parsed) : parsed;
        transactions = parsedObj.transactions || [];
      } catch (e) {
        setFileError("Failed to parse transactions from LLM response.");
        return;
      }
      setRawTransactions(transactions);
      setImportedTransactions(transactions);
      setFileError(null);
    } catch (err) {
      setFileError((err as Error).message || "Failed to parse file with LLM");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropAreaClick = () => {
    fileInputRef.current?.click();
  };

  // When the exchange changes, clear file and transaction state, but keep the new selection
  const handleExchangeChange = (exchange: string) => {
    setSelectedExchange(exchange); // keep the new selection
    setImportedTransactions([]);
    setRawTransactions([]);
    setColumnWarning(null);
    setFileError(null);
    setSelectedFile(null);
  };

  // Only remap if there are raw transactions (prevents remapping on clear)
  React.useEffect(() => {
    if (selectedExchange && rawTransactions.length > 0) {
      const expected = getExpectedColumns(selectedExchange);
      const actual = Object.keys(rawTransactions[0] || {});
      const missing = hasAllRequiredColumns(actual, expected);
      if (expected.length && missing.length) {
        setColumnWarning(
          `Warning: The uploaded file is missing required columns for ${selectedExchange}: ${missing.join(
            ", "
          )}`
        );
      } else {
        setColumnWarning(null);
      }
      console.log(
        "Exchange changed, mapping transactions for:",
        selectedExchange
      );
      setImportedTransactions(
        mapExchangeTransactions(selectedExchange, rawTransactions)
      );
      setFileError(null);
    }
  }, [selectedExchange, rawTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      // 1. Create portfolio
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: portfolioName,
          description,
          exchange: selectedExchange,
        }),
        credentials: "include", // Ensure cookies are sent
      });
      if (!res.ok) throw new Error(await res.text());
      const { portfolio } = await res.json();
      // 2. Submit transactions if any
      if (portfolio && importedTransactions.length > 0) {
        const txRes = await fetch(
          `/api/portfolio/${portfolio.id}/transactions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transactions: importedTransactions }),
            credentials: "include", // Ensure cookies are sent
          }
        );
        if (!txRes.ok) throw new Error(await txRes.text());
      }
      setSubmitSuccess(true);
      // Optionally clear form or close modal here
    } catch (err) {
      setSubmitError((err as Error).message || "Failed to create portfolio");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={cn("grid items-start gap-6", className)}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3">
        <Label htmlFor="portfolioName">Portfolio Name</Label>
        <Input
          id="portfolioName"
          placeholder="e.g. Retirement Fund"
          value={portfolioName}
          onChange={(e) => setPortfolioName(e.target.value)}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="exchangeFile">
          Import Transactions (CSV/XLSX, optional)
        </Label>
        <div className="grid gap-3">
          <Combobox
            options={supportedExchanges}
            value={selectedExchange}
            onChange={handleExchangeChange}
            placeholder="Select an exchange"
          />
        </div>
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleDropAreaClick}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed rounded-md p-4 transition-colors cursor-pointer",
            dragActive ? "border-blue-500 bg-blue-50" : "border-muted"
          )}
        >
          <Input
            id="exchangeFile"
            type="file"
            accept=".csv,.xlsx,.pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          <span className="text-sm text-muted-foreground">
            {selectedFile
              ? `Selected file: ${selectedFile.name}`
              : "Drag and drop a CSV/XLSX/PDF/TXT file here, or click to select"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          You can create a portfolio without importing transactions now. This
          step is optional.
        </span>
        {fileError && (
          <span className="text-red-600 text-xs font-medium">{fileError}</span>
        )}
        {importedTransactions.length > 0 && !fileError && (
          <span className="text-green-600 text-xs font-medium">
            File imported and parsed successfully!
          </span>
        )}
        {rawTransactions.length > 0 && !selectedExchange && !fileError && (
          <span className="text-yellow-600 text-xs font-medium">
            File loaded. Please select an exchange to map transactions.
          </span>
        )}
        {columnWarning && (
          <span className="text-yellow-600 text-xs font-medium">
            {columnWarning}
          </span>
        )}
        {/* Preview imported transactions */}
        {(importedTransactions.length > 0 ||
          (rawTransactions.length > 0 && !selectedExchange)) && (
          <div className="mt-2 border rounded bg-muted p-2 overflow-x-auto">
            <div className="font-semibold text-xs mb-1">
              Preview (
              {selectedExchange
                ? importedTransactions.length
                : rawTransactions.length}{" "}
              transactions)
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {Object.keys(
                    (selectedExchange
                      ? importedTransactions[0]
                      : rawTransactions[0]) ?? {}
                  )
                    .slice(0, 6)
                    .map((key) => (
                      <th
                        key={key}
                        className="px-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {(selectedExchange ? importedTransactions : rawTransactions)
                  .slice(0, 5)
                  .map((tx, i) => (
                    <tr key={i} className="border-t">
                      {Object.keys(
                        (selectedExchange
                          ? importedTransactions[0]
                          : rawTransactions[0]) ?? {}
                      )
                        .slice(0, 6)
                        .map((key) => (
                          <td key={key} className="px-2 py-1 whitespace-nowrap">
                            {String(tx[key] ?? "")}
                          </td>
                        ))}
                    </tr>
                  ))}
              </tbody>
            </table>
            {(selectedExchange
              ? importedTransactions.length
              : rawTransactions.length) > 5 && (
              <div className="text-xs text-muted-foreground mt-1">
                ...and{" "}
                {(selectedExchange
                  ? importedTransactions.length
                  : rawTransactions.length) - 5}{" "}
                more
              </div>
            )}
          </div>
        )}
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
          Portfolio created successfully!
        </span>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Portfolio"}
      </Button>
    </form>
  );
}
