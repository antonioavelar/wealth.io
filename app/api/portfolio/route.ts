import { NextRequest, NextResponse } from "next/server";
import { AppDataSource } from "@/lib/typeorm";
import { Portfolio } from "@/entities/Portfolio";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const { userId, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const portfolioRepo = AppDataSource.getRepository(Portfolio);
    const portfolio = portfolioRepo.create({
      name,
      description,
      userId,
    });
    await portfolioRepo.save(portfolio);
    return NextResponse.json({ portfolio }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
