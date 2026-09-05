import { NextRequest } from 'next/server';
import { db } from '@/db';
import { services, branches, products, productPrices } from '@/db/schema/pos';
import { eq, and, or, ilike, isNull, desc, sql, SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET - list services (catalog of jasa/biaya service) for the caller's store
export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const whereConditions: (SQL<unknown> | undefined)[] = [eq(services.storeId, storeId)];

    if (search) {
      whereConditions.push(ilike(services.name, `%${search}%`));
    }
    if (branchId) {
      // A service created without a branch (branchId: null) is store-wide —
      // sellable at every branch — so it must still show up when the caller
      // scopes the list to one branch. A strict equality here was hiding
      // every store-wide service from branch-scoped clients (mobile POS),
      // surfacing as "Product jasa tidak ditemukan di cabang ini".
      whereConditions.push(or(eq(services.branchId, branchId), isNull(services.branchId)));
    }
    if (activeOnly) {
      whereConditions.push(eq(services.isActive, true));
    }

    const servicesList = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        price: services.price,
        isActive: services.isActive,
        branchId: services.branchId,
        branchName: branches.name,
        backingProductId: products.id,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .leftJoin(branches, eq(services.branchId, branches.id))
      // Was `` eq(products.sku, `SRV-${services.id}`) `` — a JS template
      // literal, evaluated ONCE against the services.id *column object*
      // (stringifying to "[object Object]"), not per row. That made this
      // join compare every row's sku to the literal string
      // "SRV-[object Object]", so it could never match anything and
      // `backingProductId` was always null. `sql` makes the concatenation
      // part of the query itself, correlated per row.
      .leftJoin(products, sql`${products.sku} = 'SRV-' || ${services.id}`)
      .where(and(...whereConditions))
      .orderBy(desc(services.createdAt));

    return new Response(
      JSON.stringify({ success: true, data: servicesList }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - create a service (biaya service) with its POS-backed product
export async function POST(request: NextRequest) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const body = await request.json();
    const { name, description, price, branchId } = body;

    if (!name || price === undefined || price === null) {
      return new Response(
        JSON.stringify({ success: false, message: 'name and price are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'price must be a non-negative number' }),
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

    const [newService] = await db
      .insert(services)
      .values({
        id: `svc_${nanoid(10)}`,
        storeId,
        branchId: branchId || null,
        name,
        description: description || null,
        price: priceNum.toFixed(2),
        isActive: true,
      })
      .returning();

    // Auto-create the service product backing this catalog item in POS.
    // Same pattern as mechanics: sku SRV-<serviceId>, isService=true (no stock).
    const svcSku = `SRV-${newService.id}`;
    const [existingSvc] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.sku, svcSku), eq(products.storeId, storeId)))
      .limit(1);
    if (!existingSvc) {
      const [svcProduct] = await db.insert(products).values({
        id: `prod_${nanoid(16).replace(/[^a-zA-Z0-9]/g, '')}`,
        storeId,
        name: `Service: ${name}`,
        sku: svcSku,
        barcode: `SRV${nanoid(12).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
        unit: 'jasa',
        isService: true,
      }).returning();

      // `products` carries no price columns itself (see `productPrices`),
      // so without this row the backing product's price is always the
      // COALESCEd fallback "0.00" wherever it's resolved (e.g.
      // `/api/products/search`) — the service would be sellable at Rp 0.
      await db.insert(productPrices).values({
        id: `pp_${nanoid(10)}`,
        storeId,
        productId: svcProduct.id,
        branchId: branchId || null,
        purchasePrice: '0.00',
        sellingPrice: priceNum.toFixed(2),
        customerPrice: priceNum.toFixed(2),
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Service created successfully', data: newService }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating service:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
