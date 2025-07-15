// lib/market-data-types.ts

export interface MarketSymbol {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
  currency?: string;
  country?: string;
  mic_code?: string;
  isin?: string;
  // add more fields as needed
}

export interface MarketQuote {
  symbol: string;
  price: number;
  currency?: string;
  // ...other fields as needed
}

export interface MarketHistoricalPrice {
  datetime: string; // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  // ...other fields as needed
}

export interface TwelveDataSymbol {
  symbol: string;
  instrument_name: string;
  exchange?: string;
  instrument_type: string;
  currency?: string;
  country?: string;
  mic_code?: string;
  isin?: string;
  // add more fields as needed
}

export interface TwelveDataTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}
