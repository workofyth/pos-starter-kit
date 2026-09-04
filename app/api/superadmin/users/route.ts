import { NextRequest } from 'next/server';
import { APIError } from 'better-auth/api';
import { db } from '@/db';
import { branches, userBranches } from '@/db/schema/pos';
import { user } from '@/db/schema/auth';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { requirePlatformSuperAdmin, guardResponse } from '@/lib/admin-guard';

function generateTempPassword(name: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const namePrefix = (name || 'usr').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'USR';
  return `${year}${month}${namePrefix}${Math.floor(Math.random() * 90 + 10)}`;
}

// POST - create a brand new user and attach them to an existing store's branch
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePlatformSuperAdmin();
    if (!guard.ok) return guardResponse(guard);

    const body = await request.json();
    const { storeId, branchId, name, email, password, role, isMainAdmin } = body;

    if (!storeId || !branchId || !name || !email || !role) {
      return new Response(
        JSON.stringify({ success: false, message: 'storeId, branchId, name, email, and role are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['admin', 'manager', 'cashier', 'staff'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, message: 'role must be one of admin, manager, cashier, staff' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [targetBranch] = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.storeId, storeId)))
      .limit(1);

    if (!targetBranch) {
      return new Response(
        JSON.stringify({ success: false, message: 'Branch not found in the given store' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: 'A user with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const generatedPassword = password || generateTempPassword(name);

    // Not passing headers/asResponse: creates the account without attaching
    // its session cookie to the superadmin's own browser session.
    let signUpResult;
    try {
      signUpResult = await auth.api.signUpEmail({
        body: { email, password: generatedPassword, name },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return new Response(
          JSON.stringify({ success: false, message: err.body?.message || err.message }),
          { status: err.statusCode, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    if (!signUpResult?.user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to create user account' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = signUpResult.user.id;

    await db.insert(userBranches).values({
      id: `ubr_${nanoid(10)}`,
      userId: newUserId,
      branchId,
      role,
      isMainAdmin: Boolean(isMainAdmin),
    });

    // Onboard the new account against this store so their own session can
    // immediately resolve their role/branch (see GET /api/user-branches,
    // which scopes results to the caller's own users.storeId).
    await db
      .update(user)
      .set({
        isOnboarded: true,
        storeId,
        subscriptionStatus: 'trialing',
        trialStartDate: new Date(),
        hasUsedTrial: true,
      })
      .where(eq(user.id, newUserId));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        data: { id: newUserId, name, email, role, temporaryPassword: generatedPassword },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
