import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  purchaseOrders, 
  purchaseOrderDetails, 
  suppliers, 
  branches,
  products
} from '@/db/schema/pos';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET - Fetch all purchase orders
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "No store associated with user" }), { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');

    const conditions = [eq(purchaseOrders.storeId, session.user.storeId)];
    if (branchId) conditions.push(eq(purchaseOrders.branchId, branchId));
    if (status) conditions.push(eq(purchaseOrders.status, status));

    const results = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        branchId: purchaseOrders.branchId,
        branchName: branches.name,
        status: purchaseOrders.status,
        total: purchaseOrders.total,
        createdAt: purchaseOrders.createdAt,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        receivedDate: purchaseOrders.receivedDate,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Create a new purchase order
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const data = await request.json();
    const { 
      supplierId, 
      branchId, 
      items, 
      notes, 
      expectedDeliveryDate,
      subtotal,
      taxAmount,
      discountAmount,
      total
    } = data;

    if (!supplierId || !branchId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Supplier, Branch, and Items are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate supplier and branch belong to store
    const supplierExists = await db.select().from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.storeId, session.user.storeId))).limit(1);
    const branchExists = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.storeId, session.user.storeId))).limit(1);
    
    if (supplierExists.length === 0 || branchExists.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid supplier or branch' }), { status: 403 });
    }

    const poId = `po_${nanoid(10)}`;
    const orderNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${nanoid(5).toUpperCase()}`;

    const result = await db.transaction(async (tx) => {
      const [newPO] = await tx
        .insert(purchaseOrders)
        .values({
          id: poId,
          storeId: session.user.storeId,
          orderNumber,
          supplierId,
          branchId,
          status: 'pending',
          subtotal: String(subtotal),
          taxAmount: String(taxAmount || 0),
          discountAmount: String(discountAmount || 0),
          total: String(total),
          notes,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const detailValues = items.map((item: any) => ({
        id: `pod_${nanoid(10)}`,
        storeId: session.user.storeId,
        purchaseOrderId: poId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.quantity * item.unitPrice),
        createdAt: new Date(),
      }));

      await tx.insert(purchaseOrderDetails).values(detailValues);

      return newPO;
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
