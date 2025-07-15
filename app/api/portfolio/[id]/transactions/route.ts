import { NextRequest, NextResponse } from "next/server";
import { AppDataSource } from "@/lib/typeorm";
import { Transaction } from "@/entities/Transaction";
import { requireAuth } from "@/lib/requireAuth";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { transactions } = await req.json();
    const portfolioId = params.id;
    if (!portfolioId) {
      return NextResponse.json(
        { error: "Portfolio ID is required" },
        { status: 400 }
      );
    }
    const { error: authError } = await requireAuth(req);
    if (authError) return authError;

    // Accepts frontend payload: { type, symbol, exchange, amount, price, date, notes }
    // Map to backend fields
    const TransactionsPayloadSchema = z.object({
      transactions: z.array(
        z.object({
          type: z.enum(["buy", "sell", "deposit", "withdraw"]),
          symbol: z.string(),
          exchange: z.string(),
          instrument_type: z.enum(["stock", "crypto", "cash", "other"]),
          amount: z.number(),
          price: z.number(),
          date: z.string(),
          notes: z.string().optional(),
          currency: z.string(),
          assetName: z.string(), // Accept assetName
        })
      ),
    });

    // Validate request body using Zod
    const parseResult = TransactionsPayloadSchema.safeParse({ transactions });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    // Use parsed data
    const validTransactions = parseResult.data.transactions;
    // Use centralized data source initialization

    // Save all transactions in a single transaction to avoid nested transaction errors
    const created: Transaction[] = await AppDataSource.transaction(
      async (manager) => {
        const repo = manager.getRepository(Transaction);
        const results: Transaction[] = [];
        for (const tx of validTransactions) {
          // Use instrument_type from the request instead of guessing assetType
          const transaction = repo.create({
            type: tx.type,
            assetSymbol: tx.symbol,
            assetName: tx.assetName, // Use assetName from request
            assetType: tx.instrument_type,
            quantity: tx.amount,
            price: tx.price,
            date: new Date(tx.date),
            notes: tx.notes,
            portfolioId,
            currency: tx.currency,
            exchange: tx.exchange, // Add exchange field
          });
          const saved = await repo.save(transaction);
          results.push(saved);
        }
        return results;
      }
    );
    return NextResponse.json({ transactions: created }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
