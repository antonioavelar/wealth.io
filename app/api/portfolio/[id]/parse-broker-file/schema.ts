import { z } from "zod";

// Define the schema for the expected LLM output
export const TransactionSchema = z.object({
  assetSymbol: z.string(),
  assetName: z.string(),
  assetType: z.enum(["stock", "crypto", "cash", "other"]),
  type: z.enum(["buy", "sell", "deposit", "withdraw"]),
  quantity: z.number(),
  price: z.number(),
  date: z.string(), // ISO string expected from LLM
  notes: z.string().optional(),
  currency: z.string(),
  exchange: z.string(),
});

export const LLMResponseSchema = z.object({
  transactions: z.array(TransactionSchema),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;
