import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { account, session, user, verification } from "@/db/schema/auth";
import { sendEmail } from "@/lib/email-service";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL?.startsWith('http') 
        ? process.env.BETTER_AUTH_URL 
        : process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : undefined,
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    user: {
        additionalFields: {
            plan: {
                type: "string",
                required: true,
                defaultValue: "free",
            },
            subscriptionStatus: {
                type: "string",
                required: true,
                defaultValue: "none",
            },
            trialStartDate: {
                type: "date",
                required: false,
            },
            subscriptionEndDate: {
                type: "date",
                required: false,
            },
            paymentDeadline: {
                type: "date",
                required: false,
            },
            hasUsedTrial: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },
            isOnboarded: {
                type: "boolean",
                required: true,
                defaultValue: false,
            },
            storeId: {
                type: "string",
                required: false,
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        // Powers POST /api/auth/forgot-password and /api/auth/reset-password
        // (see app/api/auth/forgot-password, app/api/auth/reset-password, and
        // the app/reset-password/[token] page the emailed link points to).
        sendResetPassword: async ({ user: targetUser, url }) => {
            await sendEmail({
                to: targetUser.email,
                subject: "Reset your Talertech POS password",
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2>Reset your password</h2>
                        <p>Hi ${targetUser.name || "there"},</p>
                        <p>We received a request to reset the password for your Talertech POS account. This link expires in 1 hour.</p>
                        <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a></p>
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
            });
        },
    },
    // Enables the Flutter mobile client to authenticate with a bearer token
    // (stored in flutter_secure_storage) instead of a cookie jar: sign-in
    // responses echo the session token back in a `set-auth-token` header,
    // which the client then sends as `Authorization: Bearer <token>` on
    // every request. Cookie-based web sessions are unaffected.
    plugins: [bearer()],
});