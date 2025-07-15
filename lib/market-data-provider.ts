import {
  MarketSymbol,
  MarketQuote,
  MarketHistoricalPrice,
  TwelveDataSymbol,
  TwelveDataTimeSeriesValue,
} from "./market-data-types";

// --- Market Data Provider Interface ---
export interface MarketDataProvider {
  searchSymbols(symbol: string): Promise<MarketSymbol[]>;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getHistoricalPrices(
    symbol: string,
    options?: {
      exchange?: string;
      interval?: string; // e.g., '1day', '1h', etc.
      startDate?: string; // ISO string
      endDate?: string; // ISO string
      limit?: number;
    }
  ): Promise<MarketHistoricalPrice[]>;
}

// --- Twelve Data Implementation as a Class (Direct API) ---
export class TwelveDataProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl = "https://api.twelvedata.com";

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Twelve Data API key not configured");
    this.apiKey = apiKey;
  }

  // Map Twelve Data instrument_type to internal type
  private mapInstrumentType(
    type: string
  ): "stock" | "crypto" | "cash" | "other" {
    switch (type?.toLowerCase()) {
      case "common stock":
      case "preferred stock":
      case "etf":
      case "reit":
      case "american depositary receipt":
      case "depositary receipt":
      case "global depositary receipt":
      case "warrant":
      case "right":
      case "unit":
      case "closed-end fund":
      case "mutual fund":
      case "bond fund":
      case "trust":
      case "structured product":
      case "limited partnership":
        return "stock";
      case "digital currency":
        return "crypto";
      case "physical currency":
        return "cash";
      case "bond":
      case "exchange-traded note":
      case "index":
      case "agricultural product":
      case "energy resource":
      case "industrial metal":
      case "livestock":
      case "precious metal":
        return "other";
      default:
        return "other";
    }
  }

  async searchSymbols(symbolOrIsin: string): Promise<MarketSymbol[]> {
    if (!symbolOrIsin || symbolOrIsin.length < 2) return [];
    // Try symbol search first
    const url = `${this.baseUrl}/symbol_search?symbol=${encodeURIComponent(
      symbolOrIsin
    )}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    const result = await res.json();
    const symbols: MarketSymbol[] = (result.data || []).map(
      (item: TwelveDataSymbol) => ({
        symbol: item.symbol,
        name: item.instrument_name,
        exchange: item.exchange || null,
        type: this.mapInstrumentType(item.instrument_type),
        currency: item.currency,
        country: item.country,
        mic_code: item.mic_code,
      })
    );

    return symbols;
  }

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(
      symbol
    )}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    const result = await res.json();
    if (!result || !result.symbol || !result.price) return null;
    return {
      symbol: result.symbol,
      price: parseFloat(result.price),
      currency: result.currency,
      ...result,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    options: {
      exchange?: string;
      interval?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<MarketHistoricalPrice[]> {
    // Set default endDate to today, startDate to 30 days before endDate if not provided
    let endDate = options.endDate;
    if (!endDate) {
      const today = new Date();
      endDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    let startDate = options.startDate;
    if (!startDate) {
      const end = new Date(endDate);
      const start = new Date(end);
      start.setDate(end.getDate() - 30);
      startDate = start.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    const params = [
      `symbol=${encodeURIComponent(symbol)}`,
      `apikey=${this.apiKey}`,
      `interval=${encodeURIComponent(options.interval || "1day")}`,
    ];
    if (options.exchange)
      params.push(`exchange=${encodeURIComponent(options.exchange)}`);
    if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    const url = `${this.baseUrl}/time_series?${params.join("&")}`;
    const res = await fetch(url);
    const result = await res.json();
    if (!result || !result.values) return [];
    return (result.values as TwelveDataTimeSeriesValue[]).map((item) => ({
      datetime: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: item.volume ? parseFloat(item.volume) : undefined,
    }));
  }
}

// Default export (can swap provider here)
const apiKey = process.env.TWELVEDATA_API_KEY!;
export const marketDataProvider = new TwelveDataProvider(apiKey);
