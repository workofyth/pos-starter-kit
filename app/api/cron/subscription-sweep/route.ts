import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email-service";
import { getAccessStatus } from "@/lib/subscription";
import { getPlan } from "@/lib/plans";

const GRACE_PERIOD_DAYS = 3;
const RENEWAL_REMINDER_DAYS_BEFORE = 3;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const candidates = await db
      .select()
      .from(user)
      .where(inArray(user.subscriptionStatus, ["trialing", "active", "pending_payment"]));

    let movedToPendingPayment = 0;
    let expired = 0;
    let remindersSent = 0;

    for (const u of candidates) {
      const access = getAccessStatus(u);

      if (!access.active) {
        if (u.subscriptionStatus === "pending_payment" && access.reason === "payment_overdue") {
          // Grace window already lapsed — cut off access.
          await db.update(user).set({ subscriptionStatus: "expired" }).where(eq(user.id, u.id));
          expired++;
        } else if (u.subscriptionStatus !== "pending_payment") {
          // Trial or paid period just lapsed — give a short grace window to pay before cutting access.
          const paymentDeadline = new Date();
          paymentDeadline.setDate(paymentDeadline.getDate() + GRACE_PERIOD_DAYS);
          await db.update(user).set({
            subscriptionStatus: "pending_payment",
            paymentDeadline,
          }).where(eq(user.id, u.id));
          movedToPendingPayment++;
        }
        continue;
      }

      // Still active — check whether a renewal reminder is due.
      if (u.subscriptionStatus === "active" && u.subscriptionEndDate) {
        const now = new Date();
        const endDate = new Date(u.subscriptionEndDate);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const alreadyRemindedToday = u.lastRenewalReminderAt &&
          new Date(u.lastRenewalReminderAt).toDateString() === now.toDateString();

        if (daysRemaining <= RENEWAL_REMINDER_DAYS_BEFORE && daysRemaining >= 0 && !alreadyRemindedToday) {
          const planLabel = getPlan(u.plan)?.label ?? u.plan;
          const result = await sendEmail({
            to: u.email,
            subject: `Your ${planLabel} plan renews in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Time to renew your subscription</h2>
                <p>Hi ${u.name || "there"},</p>
                <p>Your <strong>${planLabel}</strong> plan is set to expire on ${endDate.toDateString()}. Renew now to avoid any interruption to your store.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment-gateway?plan=${u.plan}">Renew your plan</a></p>
              </div>
            `,
          });
          if (result.success) {
            await db.update(user).set({ lastRenewalReminderAt: now }).where(eq(user.id, u.id));
            remindersSent++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: candidates.length,
      movedToPendingPayment,
      expired,
      remindersSent,
    });
  } catch (error) {
    console.error("Subscription sweep error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
