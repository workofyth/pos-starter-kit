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

// GET - Fetch all purchase orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');

    let query = db
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
      .orderBy(desc(purchaseOrders.createdAt));

    const conditions = [];
    if (branchId) conditions.push(eq(purchaseOrders.branchId, branchId));
    if (status) conditions.push(eq(purchaseOrders.status, status));

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const results = await query;

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

    const poId = `po_${nanoid(10)}`;
    const orderNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${nanoid(5).toUpperCase()}`;

    // Use a transaction to ensure both PO and details are created
    const result = await db.transaction(async (tx) => {
      const [newPO] = await tx
        .insert(purchaseOrders)
        .values({
          id: poId,
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
