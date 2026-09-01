import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { forwardAuthHeaders } from "@/lib/auth-route-helpers";

// Thin, explicitly-named wrapper around better-auth's sign-in/email endpoint.
// On success, forwards both the session cookie (web) and the `set-auth-token`
// bearer token (mobile) — send that token back as `Authorization: Bearer
// <token>` on every subsequent request.
export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "email and password are required" },
        { status: 400 }
      );
    }

    const authResponse = await auth.api.signInEmail({
      body: { email, password, rememberMe },
      headers: request.headers,
      asResponse: true,
    });

    const payload = await authResponse.json().catch(() => null);

    if (!authResponse.ok) {
      return NextResponse.json(
        { success: false, message: payload?.message || "Invalid email or password" },
        { status: authResponse.status }
      );
    }

    const response = NextResponse.json(
      { success: true, data: payload },
      { status: authResponse.status }
    );
    forwardAuthHeaders(authResponse, response);
    return response;
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { success: false, message: error.body?.message || error.message },
        { status: error.statusCode }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
