import { NextRequest } from "next/server";
import { db } from "@/db";
import { storeSettings, branches } from "@/db/schema/pos";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        const { storeName, address, whatsapp, storeType } = body;

        if (!storeName || !address || !whatsapp || !storeType) {
            return new Response(JSON.stringify({ success: false, message: "Missing required fields" }), { status: 400 });
        }

        const storeId = nanoid();
        const branchId = nanoid();

        // 1. Create Store Settings
        await db.insert(storeSettings).values({
            id: storeId,
            name: storeName,
            address: address,
            whatsapp: whatsapp,
            storeType: storeType,
            ownerId: session.user.id,
        });

        // 2. Create Initial Main Branch
        await db.insert(branches).values({
            id: branchId,
            storeId: storeId,
            name: "Main Branch",
            address: address,
            phone: whatsapp,
        });

        // 3. Update User status
        await db.update(user).set({
            isOnboarded: true,
            storeId: storeId,
            // If they just signed up and haven't paid, they get trial
            subscriptionStatus: session.user.subscriptionStatus === 'none' ? 'trialing' : session.user.subscriptionStatus,
            trialStartDate: session.user.trialStartDate || new Date(),
            hasUsedTrial: true,
        }).where(eq(user.id, session.user.id));

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Onboarding error:", error);
        return new Response(JSON.stringify({ success: false, message: (error as Error).message }), { status: 500 });
    }
}
