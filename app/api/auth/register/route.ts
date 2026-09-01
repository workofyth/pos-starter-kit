import { NextRequest, NextResponse } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { forwardAuthHeaders } from "@/lib/auth-route-helpers";

// Thin, explicitly-named wrapper around better-auth's sign-up/email endpoint
// (the generic /api/auth/[...all] catch-all) so mobile/API consumers have a
// clear POST /api/auth/register instead of having to know better-auth's
// internal route names.
export async function POST(request: NextRequest) {
  try {
    const { name, email, password, image } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "name, email, and password are required" },
        { status: 400 }
      );
    }

    const authResponse = await auth.api.signUpEmail({
      body: { name, email, password, image },
      headers: request.headers,
      asResponse: true,
    });

    const payload = await authResponse.json().catch(() => null);

    if (!authResponse.ok) {
      return NextResponse.json(
        { success: false, message: payload?.message || "Registration failed" },
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
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
