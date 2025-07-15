// lib/exchange-mapping/coinbase.ts
import { NormalizedTransaction } from "../exchange-mapping";

export const coinbase = {
  config: {
    value: "coinbase",
    label: "Coinbase",
    logoUrl:
      "https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqVQJlqj/2dfd4ea3b623a7c0d8deb2ff445dee9e/Consumer_Wordmark.svg", // Official Coinbase logo (Brandfolder)
  },
  requiredColumns: [
    "Timestamp",
    "Transaction Type",
    "Asset",
    "Quantity Transacted",
  ],
  mapTransactions(raw: Record<string, unknown>[]): NormalizedTransaction[] {
    return raw.map((row) => ({
      date: String(row["Timestamp"] || row["timestamp"] || ""),
      type: String(row["Transaction Type"] || row["transaction type"] || ""),
      asset: String(row["Asset"] || row["asset"] || ""),
      amount: parseFloat(
        String(row["Quantity Transacted"] || row["quantity transacted"] || "0")
      ),
      price: parseFloat(
        String(
          row["Spot Price at Transaction"] ||
            row["spot price at transaction"] ||
            "0"
        )
      ),
      fee: parseFloat(String(row["Total Fee"] || row["total fee"] || "0")),
    }));
  },
};
