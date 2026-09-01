import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

// Thin, explicitly-named wrapper around better-auth's reset-password
// endpoint. `token` comes from the link in the email sent by
// POST /api/auth/forgot-password (the app/reset-password/[token] page reads
// it from the URL and passes it here alongside the new password).
export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "token and newPassword are required" },
        { status: 400 }
      );
    }

    await auth.api.resetPassword({
      body: { token, newPassword },
      headers: request.headers,
    });

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { success: false, message: error.body?.message || error.message },
        { status: error.statusCode }
      );
    }
    console.error("Reset-password error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
