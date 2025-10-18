import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  members,
  inventory
} from '@/db/schema/pos';
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const {
      cashierId,
      memberId,
      items,
      paymentMethod,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      paidAmount,
      notes
    } = await req.json();

    // Generate transaction number
    const date = new Date();
    const transactionNumber = `TRX-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Date.now()}`;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Insert transaction record
      const [newTransaction] = await tx.insert(transactions).values({
        id: uuidv4(),
        transactionNumber,
        branchId: 'main', // In a real app, this would come from user's branch
        cashierId,
        memberId: memberId || null,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paidAmount,
        changeAmount: paidAmount - total,
        paymentMethod,
        notes: notes || '',
        status: 'completed',
      }).returning({ id: transactions.id });

      // Process each item in the transaction
      const transactionId = newTransaction.id;
      const processedItems = [];

      for (const item of items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Insert transaction detail
        const [detail] = await tx.insert(transactionDetails).values({
          id: uuidv4(),
          transactionId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discountAmount: item.discountAmount || 0,
        }).returning();

        processedItems.push({
          ...detail,
          productName: product.name
        });

        // Update inventory
        await tx.update(inventory)
          .set({ 
            quantity: inventory.quantity - item.quantity,
            lastUpdated: new Date()
          })
          .where(and(
            eq(inventory.productId, item.productId),
            eq(inventory.branchId, 'main') // In a real app, this would be dynamic
          ));

        // Update product stock
        await tx.update(products)
          .set({ stock: product.stock - item.quantity })
          .where(eq(products.id, item.productId));
      }

      // Update member points if member is provided
      if (memberId) {
        const [member] = await tx.select().from(members).where(eq(members.id, memberId));
        if (member) {
          // Calculate points (e.g., 1 point per 1000 IDR spent)
          const pointsEarned = Math.floor(total / 1000);
          await tx.update(members)
            .set({ 
              points: member.points + pointsEarned 
            })
            .where(eq(members.id, memberId));
        }
      }

      return { transactionId, transactionNumber, processedItems };
    });

    return new Response(JSON.stringify({
      success: true,
      transactionId: result.transactionId,
      transactionNumber: result.transactionNumber,
      message: 'Transaction completed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to process transaction: ' + (error as Error).message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}