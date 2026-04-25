import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  purchaseOrders, 
  purchaseOrderDetails, 
  inventory, 
  inventoryTransactions,
  products
} from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poId = params.id;
    const { receivedItems, userId } = await request.json();
    console.log(`Processing PO Receive for ${poId} by user ${userId}`);
    console.log('Received Items:', JSON.stringify(receivedItems));

    // Fetch PO current status
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!po) {
      return new Response(
        JSON.stringify({ success: false, message: 'Purchase Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (po.status === 'received') {
      return new Response(
        JSON.stringify({ success: false, message: 'Purchase Order already received' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process receiving in a transaction
    await db.transaction(async (tx) => {
      // 1. Update PO status
      await tx
        .update(purchaseOrders)
        .set({
          status: 'received',
          receivedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, poId));

      // 2. Update details and inventory for each item
      for (const item of receivedItems) {
        // Update received quantity in details
        await tx
          .update(purchaseOrderDetails)
          .set({ receivedQuantity: item.receivedQuantity })
          .where(and(
            eq(purchaseOrderDetails.purchaseOrderId, poId),
            eq(purchaseOrderDetails.productId, item.productId)
          ));

        if (item.receivedQuantity > 0) {
          // Check if item exists in inventory for this branch
          const [existingInventory] = await tx
            .select()
            .from(inventory)
            .where(and(
              eq(inventory.productId, item.productId),
              eq(inventory.branchId, po.branchId)
            ))
            .limit(1);

          let stockBefore = 0;
          let stockAfter = item.receivedQuantity;

          if (existingInventory) {
            stockBefore = existingInventory.quantity;
            stockAfter = stockBefore + item.receivedQuantity;
            
            await tx
              .update(inventory)
              .set({
                quantity: stockAfter,
                lastUpdated: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, existingInventory.id));
          } else {
            // Create new inventory record
            await tx.insert(inventory).values({
              id: `inv_${nanoid(10)}`,
              productId: item.productId,
              branchId: po.branchId,
              quantity: item.receivedQuantity,
              minStock: 5,
              maxStock: 100,
              lastUpdated: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // 3. Log mutation
          await tx.insert(inventoryTransactions).values({
            id: `itx_${nanoid(10)}`,
            productId: item.productId,
            branchId: po.branchId,
            type: 'in', // Receiving PO is a stock-in event
            quantity: item.receivedQuantity,
            stockBefore: stockBefore,
            stockAfter: stockAfter,
            referenceId: po.orderNumber,
            status: 'completed',
            notes: `Received from PO: ${po.orderNumber}`,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Purchase Order received successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
