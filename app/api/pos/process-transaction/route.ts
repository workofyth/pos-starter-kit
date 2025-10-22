import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  members,
  inventory,
  userBranches
} from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
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

    // Validate required fields
    if (!cashierId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Cashier ID and items are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate financial values
    const validatedSubtotal = typeof subtotal === 'string' ? parseFloat(subtotal) : subtotal;
    const validatedDiscountAmount = typeof discountAmount === 'string' ? parseFloat(discountAmount) : discountAmount;
    const validatedTaxAmount = typeof taxAmount === 'string' ? parseFloat(taxAmount) : taxAmount;
    const validatedTotal = typeof total === 'string' ? parseFloat(total) : total;
    const validatedPaidAmount = typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;

    if (isNaN(validatedSubtotal) || isNaN(validatedDiscountAmount) || 
        isNaN(validatedTaxAmount) || isNaN(validatedTotal) || isNaN(validatedPaidAmount)) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid financial values provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate transaction number
    const date = new Date();
    const transactionNumber = `TRX-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Date.now()}`;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get the cashier's branch ID
    const cashierBranchResponse = await tx
      .select()
      .from(userBranches)
      .where(eq(userBranches.userId, cashierId));
      
    // If no branch assignment found, we should not proceed with the transaction
    if (cashierBranchResponse.length === 0) {
      throw new Error('Cashier has no branch assignment. Please contact administrator.');
    }
    
    const cashierBranchId = cashierBranchResponse[0].branchId;

    // Insert transaction record
    const [newTransaction] = await tx.insert(transactions).values({
      id: uuidv4(),
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

        // Get current inventory level
        const inventoryRecords = await tx
          .select({
            id: inventory.id,
            productId: inventory.productId,
            branchId: inventory.branchId,
            quantity: inventory.quantity,
            minStock: inventory.minStock,
            lastUpdated: inventory.lastUpdated,
            createdAt: inventory.createdAt,
            updatedAt: inventory.updatedAt
          })
          .from(inventory)
          .where(and(
            eq(inventory.productId, item.productId),
            eq(inventory.branchId, cashierBranchId)
          ));
          
        console.log(`Found ${inventoryRecords.length} inventory records for product ${item.productId} in branch ${cashierBranchId}`);
          
        let currentInventory = inventoryRecords[0];
        
        // If no inventory record exists for this product in this branch, create one with 0 quantity
        if (!currentInventory) {
          console.log(`No inventory record found for product ${item.productId} in branch ${cashierBranchId}, creating new one`);
          
          // Create a new inventory record with 0 quantity
          const [newInventory] = await tx.insert(inventory).values({
            id: `inv_${uuidv4()}`,
            productId: item.productId,
            branchId: cashierBranchId,
            quantity: 0,
            minStock: 5, // Default minimum stock
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning({
            id: inventory.id,
            productId: inventory.productId,
            branchId: inventory.branchId,
            quantity: inventory.quantity,
            minStock: inventory.minStock,
            lastUpdated: inventory.lastUpdated,
            createdAt: inventory.createdAt,
            updatedAt: inventory.updatedAt
          });
          
          currentInventory = newInventory;
          console.log(`Created new inventory record with ID ${currentInventory.id}`);
        }

        // Validate inventory quantity is a valid number
        let currentQuantity = typeof currentInventory.quantity === 'string' 
          ? parseInt(currentInventory.quantity, 10) 
          : typeof currentInventory.quantity === 'number'
          ? Math.floor(currentInventory.quantity)
          : 0; // Default to 0 if invalid
          
        // Ensure it's a valid number
        if (isNaN(currentQuantity)) {
          currentQuantity = 0;
        }
          
        console.log(`Current inventory quantity for product ${item.productId}: ${currentQuantity}`);

        // Validate item quantity is a valid number
        let itemQuantity = typeof item.quantity === 'string' 
          ? parseInt(item.quantity, 10) 
          : typeof item.quantity === 'number'
          ? Math.floor(item.quantity)
          : 0; // Default to 0 if invalid
          
        // Ensure it's a valid number
        if (isNaN(itemQuantity)) {
          itemQuantity = 0;
        }
          
        console.log(`Item quantity for product ${item.productId}: ${itemQuantity}`);

        // Ensure quantities are integers
        if (!Number.isInteger(currentQuantity) || !Number.isInteger(itemQuantity)) {
          throw new Error(`Quantities must be integers. Current: ${currentQuantity}, Item: ${itemQuantity}`);
        }

        // Calculate new quantity
        const newQuantity = currentQuantity - itemQuantity;
        
        console.log(`Calculated new quantity: ${currentQuantity} - ${itemQuantity} = ${newQuantity}`);
        
        // Ensure we don't go below zero
        if (newQuantity < 0) {
          throw new Error(`Insufficient inventory for product ${product.name}. Required: ${itemQuantity}, Available: ${currentQuantity}`);
        }

        // Update inventory - ensure we're passing valid integers
        console.log(`Updating inventory for product ${item.productId} in branch ${cashierBranchId} to ${newQuantity}`);
        
        await tx.update(inventory)
          .set({ 
            quantity: newQuantity, // Already validated as non-negative integer
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(and(
            eq(inventory.productId, item.productId),
            eq(inventory.branchId, cashierBranchId) // Use dynamic branch ID from cashier
          ));
      }

      // Update member points if member is provided
      if (memberId) {
        const [member] = await tx.select().from(members).where(eq(members.id, memberId));
        if (member) {
          // Calculate points (e.g., 1 point per 1000 IDR spent)
          const pointsEarned = Math.floor(validatedTotal / 1000);
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