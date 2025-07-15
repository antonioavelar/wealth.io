import { NextRequest, NextResponse } from "next/server";
import { AppDataSource } from "@/lib/typeorm";
import { requireAuth } from "@/lib/requireAuth";
import { User } from "@/entities/User";

export async function GET(req: NextRequest) {
  const { userId } = await requireAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  // Expose only safe fields
  return NextResponse.json({
    id: user.id,
    email: user.email,
    preferredCurrency: user.preferredCurrency,
    createdAt: user.createdAt,
  });
}
