import { NextRequest } from "next/server";
import { db } from "@/db";
import { storeSettings, branches, userBranches } from "@/db/schema/pos";
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

        // Block re-onboarding an already-onboarded account — without this, a
        // repeat call spins up a brand new store/branch, repoints users.storeId
        // at it, and leaves the account's existing userBranches assignment (and
        // access to their old store) orphaned, since GET /api/user-branches
        // scopes results to the store the user is *currently* pointed at.
        if (session.user.isOnboarded) {
            return new Response(JSON.stringify({ success: false, message: "Account is already onboarded" }), { status: 409 });
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
            type: "main",
        });

        // 3. Assign the onboarding user as main admin of the new branch — without
        // this, GET /api/user-branches?userId=... comes back empty right after
        // onboarding, the sidebar falls back to the 'guest' role, and most of
        // the menu disappears (hasAccessToMenuItem only allows Dashboard/AI
        // Assistant/Notifications for guests).
        await db.insert(userBranches).values({
            id: nanoid(),
            userId: session.user.id,
            branchId: branchId,
            role: "admin",
            isMainAdmin: true,
        });

        // 4. Update User status
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
