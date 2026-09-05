import { NextRequest } from 'next/server';
import { db } from '@/db';
import { mechanics, branches, products } from '@/db/schema/pos';
import { eq, and, or, ilike, isNull, desc, SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET - list mechanics for the caller's store
export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const whereConditions: (SQL<unknown> | undefined)[] = [eq(mechanics.storeId, storeId)];

    if (search) {
      whereConditions.push(ilike(mechanics.name, `%${search}%`));
    }
    if (branchId) {
      // A mechanic created without a branch (branchId: null) is store-wide —
      // available at every branch — so it must still show up when the caller
      // scopes the list to one branch. A strict equality here was hiding
      // every store-wide mechanic from branch-scoped clients (mobile POS).
      whereConditions.push(or(eq(mechanics.branchId, branchId), isNull(mechanics.branchId)));
    }
    if (activeOnly) {
      whereConditions.push(eq(mechanics.isActive, true));
    }

    const mechanicsList = await db
      .select({
        id: mechanics.id,
        name: mechanics.name,
        phone: mechanics.phone,
        serviceType: mechanics.serviceType,
        servicePrice: mechanics.servicePrice,
        description: mechanics.description,
        isActive: mechanics.isActive,
        branchId: mechanics.branchId,
        branchName: branches.name,
        createdAt: mechanics.createdAt,
        updatedAt: mechanics.updatedAt,
      })
      .from(mechanics)
      .leftJoin(branches, eq(mechanics.branchId, branches.id))
      .where(and(...whereConditions))
      .orderBy(desc(mechanics.createdAt));

    return new Response(
      JSON.stringify({ success: true, data: mechanicsList }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - create a mechanic with their service rate
export async function POST(request: NextRequest) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const body = await request.json();
    const { name, phone, serviceType, servicePrice, description, branchId } = body;

    if (!name || !serviceType || servicePrice === undefined || servicePrice === null) {
      return new Response(
        JSON.stringify({ success: false, message: 'name, serviceType, and servicePrice are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const price = Number(servicePrice);
    if (Number.isNaN(price) || price < 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'servicePrice must be a non-negative number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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

    const [newMechanic] = await db
      .insert(mechanics)
      .values({
        id: `mch_${nanoid(10)}`,
        storeId,
        branchId: branchId || null,
        name,
        phone: phone || null,
        serviceType,
        servicePrice: price.toFixed(2),
        description: description || null,
        isActive: true,
      })
      .returning();

    // Auto-create the service product backing this mechanic's jasa in POS.
    // Same pattern as process-transaction: sku SVC-<mechanicId>, isService=true.
    const svcSku = `SVC-${newMechanic.id}`;
    const [existingSvc] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.sku, svcSku), eq(products.storeId, storeId)))
      .limit(1);
    if (!existingSvc) {
      await db.insert(products).values({
        id: `prod_${nanoid(16).replace(/[^a-zA-Z0-9]/g, '')}`,
        storeId,
        name: `Jasa ${serviceType} - ${name}`,
        sku: svcSku,
        barcode: `SVC${nanoid(12).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
        unit: 'jasa',
        isService: true,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Mechanic created successfully', data: newMechanic }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating mechanic:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
