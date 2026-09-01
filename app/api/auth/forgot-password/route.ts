import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

// Thin, explicitly-named wrapper around better-auth's request-password-reset
// endpoint. Always responds with a generic success message regardless of
// whether the email is registered — this is intentional (matches
// better-auth's own behavior) so callers can't use this endpoint to probe
// which emails have accounts.
export async function POST(request: NextRequest) {
  try {
    const { email, redirectTo } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required" },
        { status: 400 }
      );
    }

    await auth.api.requestPasswordReset({
      body: { email, redirectTo: redirectTo || "/sign-in" },
      headers: request.headers,
    });

    return NextResponse.json({
      success: true,
      message: "If this email exists in our system, check your email for the reset link",
    });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { success: false, message: error.body?.message || error.message },
        { status: error.statusCode }
      );
    }
    console.error("Forgot-password error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
