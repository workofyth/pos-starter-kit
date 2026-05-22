import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  members,
  inventory,
  userBranches,
  inventoryTransactions,
  categories,
  exchangePoints,
  branches
} from '@/db/schema/pos';
import { broadcastToBranch } from '@/lib/notification-sse';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const storeId = session.user.storeId;
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
    }: {
      cashierId: string;
      memberId?: string;
      items: Array<{
        productId: string;
        quantity: number | string;
        unitPrice: string | number;
        totalPrice: string | number;
        discountAmount?: number;
        isExchange?: boolean;
      }>;
      paymentMethod: string;
      subtotal: string | number;
      discountAmount: string | number;
      taxAmount: string | number;
      total: string | number;
      paidAmount: string | number;
      notes?: string;
    } = await req.json();

    if (!cashierId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Cashier ID and items are required' }), { status: 400 });
    }

    const validatedSubtotal = typeof subtotal === 'string' ? parseFloat(subtotal) : subtotal;
    const validatedDiscountAmount = typeof discountAmount === 'string' ? parseFloat(discountAmount) : discountAmount;
    const validatedTaxAmount = typeof taxAmount === 'string' ? parseFloat(taxAmount) : taxAmount;
    const validatedTotal = typeof total === 'string' ? parseFloat(total) : total;
    const validatedPaidAmount = typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;

    if (isNaN(validatedSubtotal) || isNaN(validatedDiscountAmount) || isNaN(validatedTaxAmount) || isNaN(validatedTotal) || isNaN(validatedPaidAmount)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid financial values provided' }), { status: 400 });
    }

    const date = new Date();
    const transactionNumber = `TRX-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Date.now()}`;

    const result = await db.transaction(async (tx) => {
      // 1. Get Branch (Scoped to Store)
      const cashierBranchResponse = await tx.select().from(userBranches)
        .where(and(
          eq(userBranches.userId, cashierId),
          inArray(userBranches.branchId, tx.select({ id: branches.id }).from(branches).where(eq(branches.storeId, storeId)))
        ));
      
      if (cashierBranchResponse.length === 0) {
        throw new Error('Cashier branch assignment not found or invalid for this store.');
      }
      const cashierBranchId = cashierBranchResponse[0].branchId;

      // 2. Create Transaction (Linked to Store)
      const [newTransaction] = await tx.insert(transactions).values({
        id: uuidv4(),
        storeId,
        transactionNumber,
        branchId: cashierBranchId,
        cashierId,
        memberId: memberId || null,
        subtotal: validatedSubtotal.toString(),
        discountAmount: validatedDiscountAmount.toString(),
        taxAmount: validatedTaxAmount.toString(),
        total: validatedTotal.toString(),
        paidAmount: validatedPaidAmount.toString(),
        changeAmount: (validatedPaidAmount - validatedTotal).toString(),
        paymentMethod: paymentMethod as any,
        notes: notes || '',
        status: 'completed',
      }).returning({ id: transactions.id });

      const transactionId = newTransaction.id;
      const processedItems = [];
      let totalPointsEarned = 0;
      let totalPointsSpent = 0;

      for (const item of items) {
        // Scoped lookup
        const [product] = await tx.select({
            id: products.id, name: products.name, categoryId: products.categoryId, point: categories.point
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(and(eq(products.id, item.productId), eq(products.storeId, storeId)));
        
        if (!product) throw new Error(`Product ${item.productId} not found in this store`);

        const itemQty = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : item.quantity;
        if (!item.isExchange) {
          totalPointsEarned += parseFloat(product.point?.toString() || "0") * itemQty;
        } else {
          const [exchangeConfig] = await tx.select().from(exchangePoints)
            .where(and(eq(exchangePoints.productId, item.productId), eq(exchangePoints.storeId, storeId)))
            .limit(1);
          if (exchangeConfig) totalPointsSpent += exchangeConfig.pointExchangeTotal * itemQty;
        }

        const [detail] = await tx.insert(transactionDetails).values({
          id: uuidv4(),
          storeId,
          transactionId,
          productId: item.productId,
          quantity: itemQty,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          discountAmount: item.discountAmount ? item.discountAmount.toString() : "0",
          isExchange: item.isExchange || false,
        }).returning();

        processedItems.push({ ...detail, productName: product.name });

        // Inventory Management (Scoped)
        const [currentInventory] = await tx.select().from(inventory)
          .where(and(eq(inventory.productId, item.productId), eq(inventory.branchId, cashierBranchId), eq(inventory.storeId, storeId)));
          
        let inventoryRecord = currentInventory;
        if (!inventoryRecord) {
          const [newInv] = await tx.insert(inventory).values({
            id: `inv_${uuidv4()}`,
            storeId,
            productId: item.productId,
            branchId: cashierBranchId,
            quantity: 0,
            minStock: 5,
            lastUpdated: new Date()
          }).returning();
          inventoryRecord = newInv;
        }

        const currentQuantity = Number(inventoryRecord.quantity);
        const newQuantity = currentQuantity - itemQty;
        if (newQuantity < 0) throw new Error(`Insufficient stock for ${product.name}`);

        await tx.update(inventory).set({ quantity: newQuantity, lastUpdated: new Date(), updatedAt: new Date() })
          .where(eq(inventory.id, inventoryRecord.id));

        await tx.insert(inventoryTransactions).values({
          id: uuidv4(),
          storeId,
          productId: item.productId,
          branchId: cashierBranchId,
          type: 'pos',
          quantity: itemQty,
          stockBefore: currentQuantity,
          stockAfter: newQuantity,
          referenceId: transactionNumber,
          notes: notes ? `POS: ${notes}` : `POS Sale: ${transactionNumber}`,
          createdBy: cashierId,
          status: 'completed'
        });
      }

      if (memberId) {
        const [member] = await tx.select().from(members).where(and(eq(members.id, memberId), eq(members.storeId, storeId)));
        if (member) {
          const currentPoints = parseFloat(member.points?.toString() || "0");
          const newPoints = currentPoints + totalPointsEarned - totalPointsSpent;
          if (newPoints < 0) throw new Error(`Insufficient points for ${member.name}`);
          await tx.update(members).set({ points: newPoints.toFixed(2) }).where(eq(members.id, memberId));
        }
      }

      return { transactionId, transactionNumber, processedItems, branchId: cashierBranchId };
    });

    try {
      if (result.branchId) {
        await broadcastToBranch(result.branchId, {
          title: "Transaksi Baru",
          message: `Transaksi ${result.transactionNumber} berhasil diproses.`,
          type: "transaction_created",
          data: { transactionId: result.transactionId, transactionNumber: result.transactionNumber, total: validatedTotal }
        });
        await broadcastToBranch(result.branchId, { title: "Update Stok", message: "Stok telah diperbarui.", type: "inventory_update" });
      }
    } catch (e) {}

    return new Response(JSON.stringify({
      success: true,
      transactionId: result.transactionId,
      transactionNumber: result.transactionNumber,
      message: 'Transaction completed successfully'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error processing transaction:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), { status: 500 });
  }
}