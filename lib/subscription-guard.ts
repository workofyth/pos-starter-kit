import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAccessStatus, type AccessReason } from "@/lib/subscription";

export type SubscriptionGuardResult =
  | { ok: true; userId: string; storeId: string; plan: string; subscriptionStatus: string }
  | { ok: false; status: 401 | 402 | 409; message: string; reason?: AccessReason };

/**
 * Verifies the caller has a session AND has completed onboarding (has a store).
 * Use at the top of any route that assumes session.user.storeId exists.
 */
export async function requireOnboarded(): Promise<SubscriptionGuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: sign-in required" };
  }

  if (!session.user.isOnboarded || !session.user.storeId) {
    return { ok: false, status: 409, message: "Store setup is not complete. Please finish onboarding first." };
  }

  return {
    ok: true,
    userId: session.user.id,
    storeId: session.user.storeId,
    plan: session.user.plan,
    subscriptionStatus: session.user.subscriptionStatus,
  };
}

/**
 * Verifies the caller is onboarded AND their trial/subscription is currently
 * active. Use on state-mutating routes (create/update/delete) so an expired
 * account can't write data even if it calls the API directly.
 */
export async function requireActiveAccess(): Promise<SubscriptionGuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized: sign-in required" };
  }

  if (!session.user.isOnboarded || !session.user.storeId) {
    return { ok: false, status: 409, message: "Store setup is not complete. Please finish onboarding first." };
  }

  const access = getAccessStatus({
    subscriptionStatus: session.user.subscriptionStatus,
    trialStartDate: session.user.trialStartDate,
    subscriptionEndDate: session.user.subscriptionEndDate,
    paymentDeadline: session.user.paymentDeadline,
    hasUsedTrial: session.user.hasUsedTrial,
  });

  if (!access.active) {
    return {
      ok: false,
      status: 402,
      message: "Your trial or subscription has expired. Please upgrade your plan to continue.",
      reason: access.reason,
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    storeId: session.user.storeId,
    plan: session.user.plan,
    subscriptionStatus: session.user.subscriptionStatus,
  };
}

export function subscriptionGuardResponse(guard: Extract<SubscriptionGuardResult, { ok: false }>) {
  return new Response(
    JSON.stringify({ success: false, message: guard.message, reason: guard.reason }),
    { status: guard.status, headers: { "Content-Type": "application/json" } }
  );
}
