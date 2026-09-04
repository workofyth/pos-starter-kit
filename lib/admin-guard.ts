import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userBranches } from "@/db/schema/pos";
import { isPlatformSuperAdmin } from "@/lib/platform-admin";

export type AdminGuardResult =
  | { ok: true; userId: string; storeId: string | null }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Verifies the caller has an active session AND holds isMainAdmin on at least
 * one branch assignment. Use for endpoints that mutate cross-branch/cross-tenant
 * data (role assignment, store-wide settings, one-off migration scripts, etc.).
 */
export async function requireMainAdmin(): Promise<AdminGuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: sign-in required" };
  }

  const [assignment] = await db
    .select({ isMainAdmin: userBranches.isMainAdmin })
    .from(userBranches)
    .where(
      and(
        eq(userBranches.userId, session.user.id),
        eq(userBranches.isMainAdmin, true),
        eq(userBranches.isActive, true)
      )
    )
    .limit(1);

  if (!assignment) {
    return { ok: false, status: 403, message: "Forbidden: main admin access required" };
  }

  return { ok: true, userId: session.user.id, storeId: (session.user as { storeId?: string }).storeId ?? null };
}

/** Verifies the caller has an active session. Does not check role/admin status. */
export async function requireSession(): Promise<AdminGuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: sign-in required" };
  }

  return { ok: true, userId: session.user.id, storeId: (session.user as { storeId?: string }).storeId ?? null };
}

/**
 * Verifies the caller is one of the hardcoded platform-superadmin accounts
 * (see lib/platform-admin.ts). Use for endpoints that create/manage OTHER
 * stores/tenants — this is a level above requireMainAdmin, which only ever
 * lets someone manage their own store.
 */
export async function requirePlatformSuperAdmin(): Promise<AdminGuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: sign-in required" };
  }

  if (!isPlatformSuperAdmin(session.user.email)) {
    return { ok: false, status: 403, message: "Forbidden: platform superadmin access required" };
  }

  return { ok: true, userId: session.user.id, storeId: (session.user as { storeId?: string }).storeId ?? null };
}

export function guardResponse(guard: Extract<AdminGuardResult, { ok: false }>) {
  return new Response(
    JSON.stringify({ success: false, message: guard.message }),
    { status: guard.status, headers: { "Content-Type": "application/json" } }
  );
}
