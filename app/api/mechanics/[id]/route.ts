import { NextRequest } from 'next/server';
import { db } from '@/db';
import { mechanics, branches, products } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET - single mechanic detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    const [mechanic] = await db
      .select()
      .from(mechanics)
      .where(and(eq(mechanics.id, id), eq(mechanics.storeId, guard.storeId)))
      .limit(1);

    if (!mechanic) {
      return new Response(
        JSON.stringify({ success: false, message: 'Mechanic not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: mechanic }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching mechanic:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - update mechanic and/or their service rate
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { id } = await params;
    const body = await request.json();
    const { name, phone, serviceType, servicePrice, description, isActive, branchId } = body;

    const [existing] = await db
      .select({ id: mechanics.id })
      .from(mechanics)
      .where(and(eq(mechanics.id, id), eq(mechanics.storeId, storeId)))
      .limit(1);

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Mechanic not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (servicePrice !== undefined && servicePrice !== null) {
      const price = Number(servicePrice);
      if (Number.isNaN(price) || price < 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'servicePrice must be a non-negative number' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // If a branch is given, it must belong to the caller's store
    if (branchId) {
      const [branch] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.id, branchId), eq(branches.storeId, storeId)))
        .limit(1);
      if (!branch) {
        return new Response(
          JSON.stringify({ success: false, message: 'Branch not found in your store' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone || null;
    if (serviceType) updates.serviceType = serviceType;
    if (servicePrice !== undefined && servicePrice !== null) updates.servicePrice = Number(servicePrice).toFixed(2);
    if (description !== undefined) updates.description = description || null;
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (branchId !== undefined) updates.branchId = branchId || null;

    const [updated] = await db
      .update(mechanics)
      .set(updates)
      .where(eq(mechanics.id, id))
      .returning();

    // Keep the backing service product's name/price in sync for POS display
    if (updates.name || updates.serviceType || updates.servicePrice) {
      const [svc] = await db
        .select({ id: products.id, name: products.name, serviceType: mechanics.serviceType })
        .from(mechanics)
        .innerJoin(products, eq(products.sku, `SVC-${mechanics.id}`))
        .where(and(eq(mechanics.id, id), eq(products.storeId, guard.storeId)))
        .limit(1);
      if (svc) {
        const svcUpdates: Record<string, unknown> = { updatedAt: new Date() };
        if (updates.name || updates.serviceType) {
          svcUpdates.name = `Jasa ${updated.serviceType} - ${updated.name}`;
        }
        if (updates.servicePrice !== undefined && updates.servicePrice !== null) {
          svcUpdates.customerPrice = Number(updates.servicePrice).toFixed(2);
        }
        await db.update(products).set(svcUpdates).where(eq(products.id, svc.id));
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Mechanic updated successfully', data: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating mechanic:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE - remove a mechanic
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    const [deleted] = await db
      .delete(mechanics)
      .where(and(eq(mechanics.id, id), eq(mechanics.storeId, guard.storeId)))
      .returning();

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, message: 'Mechanic not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Mechanic deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting mechanic:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
