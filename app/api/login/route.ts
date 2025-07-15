import { NextResponse } from "next/server";
import { AppDataSource } from "@/lib/typeorm";
import { User } from "@/entities/User";
import { promisify } from "util";
import { scrypt as _scrypt, timingSafeEqual } from "crypto";
import { signJwt } from "@/lib/jwt";

const scrypt = promisify(_scrypt);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }
    // Password format: salt:hash
    const [salt, key] = user.password.split(":");
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, "hex");
    if (!timingSafeEqual(derivedKey, keyBuffer)) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }
    // Generate JWT
    const token = signJwt({ userId: user.id, email: user.email });
    // Set token as httpOnly cookie
    const response = NextResponse.json({ token });
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      // secure: true, // Uncomment if using HTTPS
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
