import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  categories,
  productPrices
} from '@/db/schema/pos';
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const filter = searchParams.get('filter') || 'daily'; // daily, weekly, monthly, yearly
    
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (filter) {
      case 'weekly':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'yearly':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'daily':
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
    }

    // Build conditions
    const conditions = [
      eq(transactions.status, 'completed'),
      gte(transactions.createdAt, startDate),
      lte(transactions.createdAt, endDate)
    ];

    if (branchId) {
      conditions.push(eq(transactions.branchId, branchId));
    }

    // 1. Fetch Transacton Details
    const results = await db
      .select({
        productId: products.id,
        productName: products.name,
        brandName: products.brand,
        categoryName: categories.name,
        quantity: transactionDetails.quantity,
        customerPrice: transactionDetails.unitPrice,
        totalSalesPrice: transactionDetails.totalPrice,
        createdAt: transactions.createdAt
      })
      .from(transactionDetails)
      .innerJoin(transactions, eq(transactionDetails.transactionId, transactions.id))
      .innerJoin(products, eq(transactionDetails.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));

    if (results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: { omzetData: [], totalOmzet: 0, period: { start: startDate, end: endDate, filter } }
      }), { status: 200 });
    }

    // 2. Fetch Product Prices
    // Get unique product IDs
    const productIds = Array.from(new Set(results.map(r => r.productId)));
    
    // Fetch all prices for these products to find the latest
    const allPrices = await db
      .select()
      .from(productPrices)
      .where(inArray(productPrices.productId, productIds))
      .orderBy(desc(productPrices.createdAt));

    // Map latest price per product
    const priceMap: Record<string, number> = {};
    allPrices.forEach(p => {
      if (!(p.productId in priceMap)) {
        priceMap[p.productId] = Number(p.purchasePrice);
      }
    });

    // 3. Aggregate data
    const omzetDataMap: Record<string, any> = {};

    results.forEach(curr => {
      const key = `${curr.productName}-${curr.brandName}-${curr.categoryName}`;
      const qty = Number(curr.quantity);
      const sales = Number(curr.totalSalesPrice);
      const purchasePrice = priceMap[curr.productId] || 0;

      if (omzetDataMap[key]) {
        omzetDataMap[key].qty += qty;
        omzetDataMap[key].grandTotalSales += sales;
      } else {
        omzetDataMap[key] = {
          productName: curr.productName,
          brandName: curr.brandName || '-',
          categoryName: curr.categoryName || 'Uncategorized',
          qty: qty,
          customerPrice: Number(curr.customerPrice),
          purchasePrice: purchasePrice,
          grandTotalSales: sales
        };
      }
    });

    const omzetData = Object.values(omzetDataMap);
    const totalOmzet = omzetData.reduce((sum: number, item: any) => sum + item.grandTotalSales, 0);

    return new Response(JSON.stringify({
      success: true,
      data: {
        omzetData,
        totalOmzet,
        period: {
          start: startDate,
          end: endDate,
          filter
        }
      }
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error('Error fetching omzet details:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
