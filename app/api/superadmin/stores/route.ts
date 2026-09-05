import { NextRequest } from 'next/server';
import { APIError } from 'better-auth/api';
import { db } from '@/db';
import { storeSettings, branches, userBranches } from '@/db/schema/pos';
import { user } from '@/db/schema/auth';
import { eq, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { requirePlatformSuperAdmin, guardResponse } from '@/lib/admin-guard';
import { isValidStoreType, isValidBranchMode } from '@/lib/store-types';

function generateTempPassword(name: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const namePrefix = (name || 'usr').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'USR';
  return `${year}${month}${namePrefix}${Math.floor(Math.random() * 90 + 10)}`;
}

// GET - list every store on the platform with owner + headcount info
export async function GET() {
  try {
    const guard = await requirePlatformSuperAdmin();
    if (!guard.ok) return guardResponse(guard);

    const stores = await db
      .select({
        id: storeSettings.id,
        name: storeSettings.name,
        address: storeSettings.address,
        whatsapp: storeSettings.whatsapp,
        storeType: storeSettings.storeType,
        branchMode: storeSettings.branchMode,
        createdAt: storeSettings.createdAt,
        ownerId: storeSettings.ownerId,
        ownerName: user.name,
        ownerEmail: user.email,
      })
      .from(storeSettings)
      .leftJoin(user, eq(storeSettings.ownerId, user.id))
      .orderBy(sql`${storeSettings.createdAt} desc`);

    if (stores.length === 0) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storeIds = stores.map((s) => s.id);

    const branchCounts = await db
      .select({ storeId: branches.storeId, n: sql<number>`count(*)` })
      .from(branches)
      .where(inArray(branches.storeId, storeIds))
      .groupBy(branches.storeId);

    const staffCounts = await db
      .select({ storeId: branches.storeId, n: sql<number>`count(distinct ${userBranches.userId})` })
      .from(userBranches)
      .innerJoin(branches, eq(userBranches.branchId, branches.id))
      .where(inArray(branches.storeId, storeIds))
      .groupBy(branches.storeId);

    const branchMap = new Map(branchCounts.map((b) => [b.storeId, Number(b.n)]));
    const staffMap = new Map(staffCounts.map((s) => [s.storeId, Number(s.n)]));

    const data = stores.map((s) => ({
      ...s,
      branchCount: branchMap.get(s.id) || 0,
      staffCount: staffMap.get(s.id) || 0,
    }));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing stores:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - provision a brand new store + main branch + owner user in one go
export async function POST(request: NextRequest) {
  try {
    const guard = await requirePlatformSuperAdmin();
    if (!guard.ok) return guardResponse(guard);

    const body = await request.json();
    const { storeName, address, whatsapp, storeType, branchMode, owner } = body;

    if (!storeName || !address || !whatsapp || !storeType) {
      return new Response(
        JSON.stringify({ success: false, message: 'storeName, address, whatsapp, and storeType are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidStoreType(storeType)) {
      return new Response(
        JSON.stringify({ success: false, message: `storeType must be one of VAPE, WARUNG, MINIMARKET, BENGKEL` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (branchMode !== undefined && !isValidBranchMode(branchMode)) {
      return new Response(
        JSON.stringify({ success: false, message: 'branchMode must be single or multi' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!owner?.name || !owner?.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'owner.name and owner.email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [existingOwner] = await db.select({ id: user.id }).from(user).where(eq(user.email, owner.email)).limit(1);
    if (existingOwner) {
      return new Response(
        JSON.stringify({ success: false, message: 'A user with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const generatedPassword = owner.password || generateTempPassword(owner.name);

    // Not passing headers/asResponse: this creates the account without
    // attaching its session cookie to the superadmin's own response, so the
    // superadmin's browser session is left untouched.
    let signUpResult;
    try {
      signUpResult = await auth.api.signUpEmail({
        body: { email: owner.email, password: generatedPassword, name: owner.name },
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
        JSON.stringify({ success: false, message: 'Failed to create owner account' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ownerId = signUpResult.user.id;
    const storeId = nanoid();
    const branchId = nanoid();

    await db.insert(storeSettings).values({
      id: storeId,
      name: storeName,
      address,
      whatsapp,
      storeType,
      branchMode: branchMode ?? 'multi',
      ownerId,
    });

    await db.insert(branches).values({
      id: branchId,
      storeId,
      name: 'Main Branch',
      address,
      phone: whatsapp,
      type: 'main',
    });

    await db.insert(userBranches).values({
      id: `ubr_${nanoid(10)}`,
      userId: ownerId,
      branchId,
      role: 'admin',
      isMainAdmin: true,
    });

    await db
      .update(user)
      .set({
        isOnboarded: true,
        storeId,
        subscriptionStatus: 'trialing',
        trialStartDate: new Date(),
        hasUsedTrial: true,
      })
      .where(eq(user.id, ownerId));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Store and owner account created successfully',
        data: {
          storeId,
          branchId,
          owner: { id: ownerId, name: owner.name, email: owner.email, temporaryPassword: generatedPassword },
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating store:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
