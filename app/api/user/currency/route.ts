import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/repositories/UserRepository";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { preferredCurrency } = await req.json();
    if (!preferredCurrency || typeof preferredCurrency !== "string") {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }
    const user = await UserRepository.updatePreferredCurrency(
      userId,
      preferredCurrency
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, preferredCurrency });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
