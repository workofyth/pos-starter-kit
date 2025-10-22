import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches } from '@/db/schema/pos';
import { eq, and, sql, count } from 'drizzle-orm';

// GET - Get inventory summary statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const branchId = searchParams.get('branchId') || '';
    
    // Build where conditions
    let whereConditions = [];
    
    if (branchId) {
      whereConditions.push(eq(inventory.branchId, branchId));
    }
    
    // Total products count
    const totalProductsResult = await db
      .select({ count: count() })
      .from(inventory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    const totalProducts = typeof totalProductsResult[0].count === 'number' 
      ? totalProductsResult[0].count 
      : parseInt(totalProductsResult[0].count as string);
    
    // Low stock products count (quantity <= minStock and quantity > 0)
    const lowStockCondition = whereConditions.length > 0 
      ? and(...whereConditions, sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`)
      : and(sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`);
    
    const lowStockResult = await db
      .select({ count: count() })
      .from(inventory)
      .where(lowStockCondition);
    
    const lowStockCount = typeof lowStockResult[0].count === 'number' 
      ? lowStockResult[0].count 
      : parseInt(lowStockResult[0].count as string);
    
    // Out of stock products count (quantity = 0)
    const outOfStockCondition = whereConditions.length > 0 
      ? and(...whereConditions, eq(inventory.quantity, 0))
      : eq(inventory.quantity, 0);
    
    const outOfStockResult = await db
      .select({ count: count() })
      .from(inventory)
      .where(outOfStockCondition);
    
    const outOfStockCount = typeof outOfStockResult[0].count === 'number' 
      ? outOfStockResult[0].count 
      : parseInt(outOfStockResult[0].count as string);
    
    // Overstock products count (quantity > minStock * 2)
    const overstockCondition = whereConditions.length > 0 
      ? and(...whereConditions, sql`${inventory.quantity} > (${inventory.minStock} * 2)`)
      : sql`${inventory.quantity} > (${inventory.minStock} * 2)`;
    
    const overstockResult = await db
      .select({ count: count() })
      .from(inventory)
      .where(overstockCondition);
    
    const overstockCount = typeof overstockResult[0].count === 'number' 
      ? overstockResult[0].count 
      : parseInt(overstockResult[0].count as string);
    
    // Total inventory value (assuming average cost is available or can be calculated)
    // For now, we'll just return counts
    
    // Top low stock products (with quantity <= minStock)
    const topLowStockProducts = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        productName: products.name,
        productSku: products.sku,
        branchName: branches.name
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .where(
        whereConditions.length > 0 
          ? and(...whereConditions, sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`)
          : and(sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`)
      )
      .orderBy(inventory.quantity)
      .limit(5);
    
    // Top out of stock products
    const topOutOfStockProducts = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        productName: products.name,
        productSku: products.sku,
        branchName: branches.name
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .where(
        whereConditions.length > 0 
          ? and(...whereConditions, eq(inventory.quantity, 0))
          : eq(inventory.quantity, 0)
      )
      .limit(5);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary: {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            overstockCount,
            totalValue: 0 // Placeholder for now
          },
          topLowStock: topLowStockProducts,
          topOutOfStock: topOutOfStockProducts
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
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