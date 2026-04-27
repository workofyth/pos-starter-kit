import { db } from "@/db";
import { transactions, branches, userBranches, user, appSettings } from "@/db/schema/pos";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { format } from "date-fns";

export interface DailySummary {
  branchName: string;
  totalTransactions: number;
  totalOmset: number;
  totalDiscount: number;
  netRevenue: number;
}

export async function getDailyOmsetSummary(date: Date = new Date()): Promise<DailySummary[]> {
  // Set start and end of the given date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const summary = await db
      .select({
        branchId: transactions.branchId,
        branchName: branches.name,
        totalTransactions: sql<number>`count(${transactions.id})`,
        totalOmset: sql<number>`sum(${transactions.subtotal})`,
        totalDiscount: sql<number>`sum(${transactions.discountAmount})`,
        netRevenue: sql<number>`sum(${transactions.total})`,
      })
      .from(transactions)
      .innerJoin(branches, eq(transactions.branchId, branches.id))
      .where(
        and(
          gte(transactions.createdAt, startOfDay),
          lt(transactions.createdAt, endOfDay),
          eq(transactions.status, "completed")
        )
      )
      .groupBy(transactions.branchId, branches.name);

    return summary.map(s => ({
      branchName: s.branchName,
      totalTransactions: Number(s.totalTransactions),
      totalOmset: Number(s.totalOmset),
      totalDiscount: Number(s.totalDiscount),
      netRevenue: Number(s.netRevenue),
    }));
  } catch (error) {
    console.error("Error fetching daily omset summary:", error);
    return [];
  }
}

export async function getReportRecipients(): Promise<string[]> {
  try {
    // 1. Check if owner_email is set in app_settings
    const [ownerEmailSetting] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, "owner_email"))
      .limit(1);

    if (ownerEmailSetting?.value) {
      return [ownerEmailSetting.value];
    }

    // 2. Fallback to all main admins
    const admins = await db
      .select({
        email: user.email,
      })
      .from(userBranches)
      .innerJoin(user, eq(userBranches.userId, user.id))
      .where(eq(userBranches.isMainAdmin, true));

    return admins.map(a => a.email).filter((email): email is string => !!email);
  } catch (error) {
    console.error("Error fetching report recipients:", error);
    return [];
  }
}

export async function isEmailReportingEnabled(): Promise<boolean> {
  try {
    const [setting] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, "enable_email_reports"))
      .limit(1);
    
    return setting?.value === "true";
  } catch (error) {
    return false;
  }
}
