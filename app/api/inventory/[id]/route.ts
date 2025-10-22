import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions } from '@/db/schema/pos';
import { eq, and, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET - Get specific inventory item details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const inventoryItem = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        lastUpdated: inventory.lastUpdated,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productSku: products.sku,
        productBarcode: products.barcode,
        productDescription: products.description,
        productImageUrl: products.imageUrl,
        branchName: branches.name,
        branchAddress: branches.address,
        branchPhone: branches.phone,
        branchEmail: branches.email
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (inventoryItem.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory item not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Get recent transactions for this inventory item
    const recentTransactions = await db
      .select({
        id: inventoryTransactions.id,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        notes: inventoryTransactions.notes,
        createdAt: inventoryTransactions.createdAt,
        createdBy: inventoryTransactions.createdBy
      })
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.productId, inventoryItem[0].productId),
          eq(inventoryTransactions.branchId, inventoryItem[0].branchId)
        )
      )
      .orderBy(inventoryTransactions.createdAt)
      .limit(10);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...inventoryItem[0],
          recentTransactions
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// PUT - Update inventory item (stock level, min stock, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      quantity,
      minStock,
      notes = ''
    } = body;
    
    // Check if inventory item exists
    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (existingInventory.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory item not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the inventory item
    const [updatedInventory] = await db
      .update(inventory)
      .set({
        quantity: quantity !== undefined ? quantity : existingInventory[0].quantity,
        minStock: minStock !== undefined ? minStock : existingInventory[0].minStock,
        lastUpdated: new Date(),
        updatedAt: new Date()
      })
      .where(eq(inventory.id, id))
      .returning();
    
    // If quantity was changed, create inventory transaction
    if (quantity !== undefined && quantity !== existingInventory[0].quantity) {
      const quantityDifference = quantity - existingInventory[0].quantity;
      const transactionType = quantityDifference > 0 ? 'in' : 'out';
      
      await db.insert(inventoryTransactions).values({
        id: `itx_${nanoid(10)}`,
        productId: existingInventory[0].productId,
        branchId: existingInventory[0].branchId,
        type: transactionType,
        quantity: Math.abs(quantityDifference),
        notes: notes || `Stock level adjusted from ${existingInventory[0].quantity} to ${quantity}`,
        createdAt: new Date(),
        createdBy: null // Would be set to actual user ID in production
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory item updated successfully',
        data: updatedInventory
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// DELETE - Delete inventory item (usually not recommended, better to set quantity to 0)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if inventory item exists
    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);
    
    if (existingInventory.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Inventory item not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the inventory item
    await db
      .delete(inventory)
      .where(eq(inventory.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory item deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}