import { NextResponse } from "next/server";

/**
 * Copies the session cookie(s) and the mobile bearer token (`set-auth-token`)
 * from a better-auth `asResponse: true` Response onto the NextResponse we
 * actually return, so both the web cookie flow and the Flutter bearer flow
 * keep working through these wrapper routes.
 */
export function forwardAuthHeaders(source: Response, target: NextResponse) {
  const setCookie = source.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookie) {
    target.headers.append("set-cookie", cookie);
  }

  const authToken = source.headers.get("set-auth-token");
  if (authToken) {
    target.headers.set("set-auth-token", authToken);
  }
}
