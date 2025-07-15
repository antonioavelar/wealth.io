// lib/exchange-mapping.ts

export interface NormalizedTransaction {
  date: string;
  type: string;
  asset: string;
  amount: number;
  price?: number;
  fee?: number;
  [key: string]: unknown;
}

import { binance } from "./exchange-mapping/binance";
import { coinbase } from "./exchange-mapping/coinbase";
import { xtb } from "./exchange-mapping/xtb";

export function getExchangeMappings() {
  return [binance, coinbase, xtb];
}

export function mapExchangeTransactions(
  exchange: string,
  raw: Record<string, unknown>[]
): NormalizedTransaction[] {
  const mappings = getExchangeMappings();
  const found = mappings.find((ex) => ex.config.value === exchange);
  if (found) {
    return found.mapTransactions(raw);
  }
  return [];
}
