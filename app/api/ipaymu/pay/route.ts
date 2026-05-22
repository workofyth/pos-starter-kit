import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, plan, method, channel } = body;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_API_KEY;
    const isSandbox = process.env.IPAYMU_MODE !== "production";
    
    if (!va || !apiKey) {
      return NextResponse.json({ success: false, error: "iPaymu configuration missing" }, { status: 500 });
    }

    const url = isSandbox 
      ? "https://sandbox.ipaymu.com/api/v2/payment/direct"
      : "https://my.ipaymu.com/api/v2/payment/direct";

    // Ensure amount is a clean string of digits
    const cleanAmount = amount.toString().replace(/\D/g, "");

    const requestBody: any = {
      name: session.user.name,
      phone: "081234567890",
      email: session.user.email,
      amount: cleanAmount,
      notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ipaymu/notify`,
      paymentMethod: method || "qris",
      referenceId: `SUB|${session.user.id}|${plan}|${Date.now()}`,
    };

    // Add optional channel if provided
    if (channel) {
      requestBody.paymentChannel = channel;
    } else if (method === "va" || method === "bank") {
      requestBody.paymentChannel = "cimb"; // Default VA channel
    } else if (method === "ewallet") {
      requestBody.paymentChannel = "shopeepay"; // Default eWallet channel
    } else if (method === "qris") {
      requestBody.paymentChannel = "qris";
    }

    const jsonBody = JSON.stringify(requestBody);
    console.log("iPaymu Request:", jsonBody);
    
    const bodyEncrypt = crypto.createHash("sha256").update(jsonBody).digest("hex");
    const stringToSign = `POST:${va}:${bodyEncrypt}:${apiKey}`;
    const signature = crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");

    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "va": va,
        "signature": signature,
        "timestamp": timestamp,
      },
      body: jsonBody,
    });

    const data = await response.json();
    console.log("iPaymu Response:", data);

    if (data.Status === 200 && data.Success) {
      return NextResponse.json({
        success: true,
        data: data.Data
      });
    } else {
      return NextResponse.json({ success: false, error: data.Message || "Failed to create payment" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error creating iPaymu payment:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
