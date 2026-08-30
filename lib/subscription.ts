const TRIAL_DAYS = 14;

export type AccessReason = "trial_expired" | "subscription_expired" | "payment_overdue";

export type AccessStatus = {
  active: boolean;
  reason?: AccessReason;
  daysRemaining?: number;
};

export type SubscriptionFields = {
  subscriptionStatus: string;
  trialStartDate: Date | string | null | undefined;
  subscriptionEndDate: Date | string | null | undefined;
  paymentDeadline: Date | string | null | undefined;
  hasUsedTrial: boolean;
};

/**
 * Single source of truth for whether a user currently has access to the app.
 * Mirrors the state machine started in components/trial-checker.tsx, but adds
 * the subscriptionEndDate check that nothing previously verified — without it
 * a user who goes "active" never gets flipped back to expired.
 */
export function getAccessStatus(user: SubscriptionFields): AccessStatus {
  const now = new Date();

  if (user.subscriptionStatus === "pending_payment") {
    const paymentDeadline = user.paymentDeadline ? new Date(user.paymentDeadline) : null;
    if (paymentDeadline && now > paymentDeadline) {
      return { active: false, reason: "payment_overdue" };
    }
    return { active: true };
  }

  if (user.subscriptionStatus === "active") {
    const subscriptionEndDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
    if (subscriptionEndDate && now > subscriptionEndDate) {
      return { active: false, reason: "subscription_expired" };
    }
    return { active: true };
  }

  if (user.subscriptionStatus === "trialing") {
    const trialStartDate = user.trialStartDate ? new Date(user.trialStartDate) : null;
    if (!trialStartDate) return { active: true };

    const diffDays = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = TRIAL_DAYS - diffDays;

    if (diffDays >= TRIAL_DAYS) {
      return { active: false, reason: "trial_expired", daysRemaining: 0 };
    }
    return { active: true, daysRemaining };
  }

  // "expired" or "none"
  return { active: false, reason: "subscription_expired" };
}
