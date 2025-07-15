// lib/exchange-mapping/xtb.ts
import { NormalizedTransaction } from "../exchange-mapping";

export const xtb = {
  config: {
    value: "xtb",
    label: "XTB",
    logoUrl:
      "https://xas.scdn5.secure.raxcdn.com/build/twigImages/svg-icons/logo/logo_xtb.svg", // Official XTB logo
  },
  requiredColumns: [
    "Position",
    "Symbol",
    "Type",
    "Volume",
    "Open time",
    "Open price",
    "Commission",
  ],
  mapTransactions(raw: Record<string, unknown>[]): NormalizedTransaction[] {
    // XTB to app type mapping
    const typeMap: Record<string, string> = {
      buy: "buy",
      sell: "sell",
      deposit: "deposit",
      withdrawal: "withdraw", // XTB might use 'withdrawal' or similar
      withdraw: "withdraw", // fallback for 'withdraw'
      // Add more mappings as needed
    };
    // Try to find the header row by values (not keys)
    const headerRowIdx = raw.findIndex((row) => {
      const values = Object.values(row).map((v) => String(v).trim());
      return (
        values.includes("Position") &&
        values.includes("Symbol") &&
        values.includes("Open time")
      );
    });
    if (headerRowIdx === -1 || !raw[headerRowIdx + 1]) {
      // Fallback: map as before
      return raw
        .filter(
          (row) =>
            row["Position"] && row["Symbol"] && !isNaN(Number(row["Position"]))
        )
        .map((row) => {
          const rawType = String(
            row["Type"] || row["type"] || ""
          ).toLowerCase();
          const mappedType = typeMap[rawType] || rawType;
          return {
            date: String(row["Open time"] || row["open time"] || ""),
            type: mappedType,
            asset: String(row["Symbol"] || row["symbol"] || ""),
            amount: parseFloat(String(row["Volume"] || row["volume"] || "0")),
            price: parseFloat(
              String(row["Open price"] || row["open price"] || "0")
            ),
            fee: parseFloat(
              String(row["Commission"] || row["commission"] || "0")
            ),
          };
        })
        .filter((tx) =>
          ["buy", "sell", "deposit", "withdraw"].includes(tx.type)
        );
    }
    // Use the next row as the header
    const headerKeys = Object.values(raw[headerRowIdx]).map((v) =>
      String(v).trim()
    );
    const dataRows = raw.slice(headerRowIdx + 1);
    return dataRows
      .filter((row) =>
        Object.values(row).some((v) => v !== undefined && v !== "")
      )
      .map((row) => {
        const values = Object.values(row);
        const obj: Record<string, unknown> = {};
        headerKeys.forEach((key, i) => {
          obj[key] = values[i];
        });
        const rawType = String(obj["Type"] || obj["type"] || "").toLowerCase();
        const mappedType = typeMap[rawType] || rawType;
        return {
          date: String(obj["Open time"] || obj["open time"] || ""),
          type: mappedType,
          asset: String(obj["Symbol"] || obj["symbol"] || ""),
          amount: parseFloat(String(obj["Volume"] || obj["volume"] || "0")),
          price: parseFloat(
            String(obj["Open price"] || obj["open price"] || "0")
          ),
          fee: parseFloat(
            String(obj["Commission"] || obj["commission"] || "0")
          ),
        };
      })
      .filter((tx) => ["buy", "sell", "deposit", "withdraw"].includes(tx.type));
  },
};
