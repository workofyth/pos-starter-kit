import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { forwardAuthHeaders } from "@/lib/auth-route-helpers";

// Thin, explicitly-named wrapper around better-auth's sign-out endpoint.
// Identifies the session from the cookie (web) or `Authorization: Bearer
// <token>` header (mobile) — whichever the caller sent.
export async function POST(request: NextRequest) {
  try {
    const authResponse = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      const payload = await authResponse.json().catch(() => null);
      return NextResponse.json(
        { success: false, message: payload?.message || "No active session to sign out of" },
        { status: authResponse.status }
      );
    }

    const response = NextResponse.json(
      { success: true, message: "Signed out" },
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
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
