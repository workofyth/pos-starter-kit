import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  purchaseOrders, 
  purchaseOrderDetails, 
  suppliers, 
  branches,
  products
} from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poId = params.id;

    const [po] = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        branchId: purchaseOrders.branchId,
        branchName: branches.name,
        status: purchaseOrders.status,
        subtotal: purchaseOrders.subtotal,
        taxAmount: purchaseOrders.taxAmount,
        discountAmount: purchaseOrders.discountAmount,
        total: purchaseOrders.total,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        receivedDate: purchaseOrders.receivedDate,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(branches, eq(purchaseOrders.branchId, branches.id))
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!po) {
      return new Response(
        JSON.stringify({ success: false, message: 'Purchase Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const items = await db
      .select({
        id: purchaseOrderDetails.id,
        productId: purchaseOrderDetails.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: purchaseOrderDetails.quantity,
        receivedQuantity: purchaseOrderDetails.receivedQuantity,
        unitPrice: purchaseOrderDetails.unitPrice,
        totalPrice: purchaseOrderDetails.totalPrice,
      })
      .from(purchaseOrderDetails)
      .leftJoin(products, eq(purchaseOrderDetails.productId, products.id))
      .where(eq(purchaseOrderDetails.purchaseOrderId, poId));

    return new Response(
      JSON.stringify({ success: true, data: { ...po, items } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching purchase order details:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
