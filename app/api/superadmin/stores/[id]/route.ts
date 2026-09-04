import { NextRequest } from 'next/server';
import { db } from '@/db';
import { storeSettings, branches, userBranches } from '@/db/schema/pos';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { requirePlatformSuperAdmin, guardResponse } from '@/lib/admin-guard';

// GET - one store's detail: its branches and the users assigned to them
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePlatformSuperAdmin();
    if (!guard.ok) return guardResponse(guard);

    const { id } = await params;

    const [store] = await db
      .select({
        id: storeSettings.id,
        name: storeSettings.name,
        address: storeSettings.address,
        whatsapp: storeSettings.whatsapp,
        storeType: storeSettings.storeType,
        createdAt: storeSettings.createdAt,
        ownerId: storeSettings.ownerId,
        ownerName: user.name,
        ownerEmail: user.email,
      })
      .from(storeSettings)
      .leftJoin(user, eq(storeSettings.ownerId, user.id))
      .where(eq(storeSettings.id, id))
      .limit(1);

    if (!store) {
      return new Response(JSON.stringify({ success: false, message: 'Store not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storeBranches = await db.select().from(branches).where(eq(branches.storeId, id));

    const users = await db
      .select({
        userBranchId: userBranches.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: userBranches.role,
        isMainAdmin: userBranches.isMainAdmin,
        isActive: userBranches.isActive,
        branchId: userBranches.branchId,
        branchName: branches.name,
        createdAt: userBranches.createdAt,
      })
      .from(userBranches)
      .innerJoin(branches, eq(userBranches.branchId, branches.id))
      .innerJoin(user, eq(userBranches.userId, user.id))
      .where(eq(branches.storeId, id));

    return new Response(
      JSON.stringify({ success: true, data: { ...store, branches: storeBranches, users } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching store detail:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - update a store's own settings (name, address, whatsapp, storeType)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePlatformSuperAdmin();
    if (!guard.ok) return guardResponse(guard);

    const { id } = await params;
    const body = await request.json();
    const { storeName, address, whatsapp, storeType } = body;

    if (storeType && !['VAPE', 'WARUNG', 'MINIMARKET'].includes(storeType)) {
      return new Response(
        JSON.stringify({ success: false, message: 'storeType must be one of VAPE, WARUNG, MINIMARKET' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (storeName) updates.name = storeName;
    if (address) updates.address = address;
    if (whatsapp) updates.whatsapp = whatsapp;
    if (storeType) updates.storeType = storeType;

    const [updated] = await db.update(storeSettings).set(updates).where(eq(storeSettings.id, id)).returning();

    if (!updated) {
      return new Response(JSON.stringify({ success: false, message: 'Store not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Store updated successfully', data: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating store:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
