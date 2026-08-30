import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // iPaymu sends notification as form-data or JSON
    // We'll handle both but usually it's form-data
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    console.log("iPaymu Notification Received:", body);

    const {
      status,
      reference_id,
      trx_id,
      amount,
      signature
    } = body;

    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_API_KEY;

    if (!va || !apiKey) {
      console.error("iPaymu config missing in notify");
      return NextResponse.json({ success: false }, { status: 500 });
    }

    // Verify signature (iPaymu v2 notify signature: sha256(va + status + trx_id + apiKey))
    // Note: status from iPaymu in notify is usually lowercase 'berhasil'
    // Some docs say it's uppercase. We should be careful.
    // Also check if the signature is provided in headers or body.
    
    const receivedSignature = signature || req.headers.get("signature");

    // Re-calculate signature to verify
    // According to iPaymu: signature = sha256(va + status + trx_id + apiKey)
    const stringToHash = `${va}${status}${trx_id}${apiKey}`;
    const calculatedSignature = crypto.createHash("sha256").update(stringToHash).digest("hex");

    // Reject when the signature is missing OR doesn't match — without this,
    // anyone could POST a fake "success" notification to grant themselves a
    // subscription for free (no signature at all previously slipped through).
    if (!receivedSignature || receivedSignature !== calculatedSignature) {
        console.error("Invalid or missing iPaymu signature:", { received: receivedSignature, calculated: calculatedSignature });
        return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 403 });
    }

    if (status === "berhasil" || status === "success") {
      // referenceId format: SUB|userId|plan|timestamp
      const parts = reference_id.split("|");
      if (parts[0] === "SUB" && parts.length >= 3) {
        const userId = parts[1];
        const plan = parts[2];

        // Update user subscription
        const now = new Date();
        const endDate = new Date();
        
        if (plan === "monthly") {
          endDate.setDate(now.getDate() + 30);
        } else if (plan === "yearly") {
          endDate.setDate(now.getDate() + 365);
        } else if (plan === "permanent") {
          endDate.setFullYear(now.getFullYear() + 99); // 99 years extension for permanent
        } else {
          endDate.setDate(now.getDate() + 30); // Default to 30 days
        }

        await db.update(user).set({
          subscriptionStatus: "active",
          subscriptionEndDate: endDate,
          plan: plan,
          updatedAt: now,
        }).where(eq(user.id, userId));

        console.log(`Subscription updated for user ${userId} to ${plan} until ${endDate}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in iPaymu notify:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
