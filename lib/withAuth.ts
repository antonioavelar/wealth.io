import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export function withAuth(
  handler: (req: NextRequest) => Promise<Response> | Response
) {
  return async function (req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    // Attach user info to request if needed (not standard in Next.js API routes)
    // You can pass payload to handler via closure or context if needed
    return handler(req);
  };
}
