// lib/exchange-mapping/binance.ts
import { NormalizedTransaction } from "../exchange-mapping";

export const binance = {
  config: {
    value: "binance",
    label: "Binance",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/57/Binance_Logo.png", // Official Binance logo (Wikipedia)
  },
  requiredColumns: ["Date(UTC)", "Type", "Asset", "Amount", "Fee"],
  mapTransactions(raw: Record<string, unknown>[]): NormalizedTransaction[] {
    return raw.map((row) => ({
      date: String(row["Date(UTC)"] || row["date(utc)"] || ""),
      type: String(row["Type"] || row["type"] || ""),
      asset: String(row["Asset"] || row["asset"] || ""),
      amount: parseFloat(String(row["Amount"] || row["amount"] || "0")),
      fee: parseFloat(String(row["Fee"] || row["fee"] || "0")),
    }));
  },
};
