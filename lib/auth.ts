import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { account, session, user, verification } from "@/db/schema/auth";

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
    emailAndPassword: {
        enabled: true,
    },
});