import { NextRequest } from 'next/server';
import { db } from '@/db';
import { services, branches, products } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET - single service detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.storeId, guard.storeId)))
      .limit(1);

    if (!service) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: service }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching service:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - update service and sync its POS-backed product
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { id } = await params;
    const body = await request.json();
    const { name, description, price, isActive, branchId } = body;

    const [existing] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, id), eq(services.storeId, storeId)))
      .limit(1);

    if (!existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (price !== undefined && price !== null) {
      const priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'price must be a non-negative number' }),
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
    if (description !== undefined) updates.description = description || null;
    if (price !== undefined && price !== null) updates.price = Number(price).toFixed(2);
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (branchId !== undefined) updates.branchId = branchId || null;

    const [updated] = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, id))
      .returning();

    // Keep the backing service product's name/price in sync for POS display
    const svcUpdates: Record<string, unknown> = { updatedAt: new Date() };
    let hasSvcUpdates = false;
    if (name) {
      svcUpdates.name = `Service: ${name}`;
      hasSvcUpdates = true;
    }
    if (price !== undefined && price !== null) {
      svcUpdates.customerPrice = Number(price).toFixed(2);
      hasSvcUpdates = true;
    }
    if (hasSvcUpdates) {
      await db
        .update(products)
        .set(svcUpdates)
        .where(and(eq(products.sku, `SRV-${id}`), eq(products.storeId, storeId)));
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Service updated successfully', data: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating service:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE - remove a service (its backing product is soft-orphaned: kept for history)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    const [deleted] = await db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.storeId, guard.storeId)))
      .returning();

    if (!deleted) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate the backing product so it no longer appears anywhere sellable,
    // but keep it because old transaction_details reference it (FK cascade).
    await db
      .update(products)
      .set({ isService: true, name: `[Dihapus] ${deleted.name}`, updatedAt: new Date() })
      .where(and(eq(products.sku, `SRV-${id}`), eq(products.storeId, guard.storeId)));

    return new Response(
      JSON.stringify({ success: true, message: 'Service deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting service:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
