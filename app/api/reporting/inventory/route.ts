import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  inventory,
  products,
  categories,
  productPrices,
  branches
} from '@/db/schema/pos';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireOnboarded, subscriptionGuardResponse } from '@/lib/subscription-guard';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    // 1. Fetch Inventory with Product and Category details
    const scopeCondition = branchId
      ? and(eq(inventory.storeId, guard.storeId), eq(inventory.branchId, branchId))
      : eq(inventory.storeId, guard.storeId);

    const inventoryData = await db
      .select({
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        categoryName: categories.name,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        branchName: branches.name,
        purchasePrice: productPrices.purchasePrice
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(branches, eq(inventory.branchId, branches.id))
      .leftJoin(
        productPrices,
        sql`${productPrices.productId} = ${products.id} AND ${productPrices.createdAt} = (SELECT MAX(created_at) FROM ${productPrices} WHERE product_id = ${products.id})`
      )
      .where(scopeCondition);

    // 2. Metrics for the inventory tab
    const totalItems = inventoryData.length;
    const totalQuantity = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = inventoryData.reduce((sum, item) => sum + ((item.quantity || 0) * Number(item.purchasePrice || 0)), 0);
    const lowStockItems = inventoryData.filter(item => (item.quantity || 0) <= (item.minStock || 0));

    // 3. Stock by Category
    const categoryDistribution: Record<string, number> = {};
    inventoryData.forEach(item => {
      const cat = item.categoryName || 'Uncategorized';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + (item.quantity || 0);
    });

    const categoryData = Object.keys(categoryDistribution).map(name => ({
      name,
      value: categoryDistribution[name]
    })).sort((a, b) => b.value - a.value);

    return new Response(JSON.stringify({
      success: true,
      data: {
        inventoryData,
        stats: {
          totalItems,
          totalQuantity,
          totalValue,
          lowStockCount: lowStockItems.length
        },
        categoryData,
        lowStockItems: lowStockItems.slice(0, 10) // Show top 10 low stock
      }
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error('Error fetching inventory report:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
