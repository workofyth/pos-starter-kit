import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  categories,
  inventory,
  productPrices,
  members
} from '@/db/schema/pos';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || null;

    // Build branch filter conditions where applicable
    const transBranchCond = branchId ? eq(transactions.branchId, branchId) : undefined;
    const invBranchCond = branchId ? eq(inventory.branchId, branchId) : undefined;

    // 1. Fetch completed transactions for revenue & sales chart
    const transConditions = [eq(transactions.status, 'completed')];
    if (transBranchCond) {
      transConditions.push(transBranchCond);
    }
    
    const completedTransactions = await db
      .select()
      .from(transactions)
      .where(and(...transConditions));

    const totalRevenue = completedTransactions.reduce((acc, t) => acc + parseFloat(String(t.total) || '0'), 0);
    const transactionsCount = completedTransactions.length;

    // Process Sales Chart (Monthly)
    const monthlyDataMap: Record<string, { sales: number; profit: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Pre-initialize last 6 months to ensure chart looks good even with no data
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        monthlyDataMap[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = { sales: 0, profit: 0 };
    }

    // 2. Fetch full detail traces to compute Category Revenue & Top Products
    const detailConditions = [eq(transactions.status, 'completed')];
    if (transBranchCond) {
      detailConditions.push(transBranchCond);
    }

    const allDetails = await db
      .select({
        qty: transactionDetails.quantity,
        total: transactionDetails.totalPrice,
        unitPrice: transactionDetails.unitPrice,
        productName: products.name,
        productId: products.id,
        categoryName: categories.name,
        transDate: transactions.createdAt
      })
      .from(transactionDetails)
      .innerJoin(transactions, eq(transactionDetails.transactionId, transactions.id))
      .innerJoin(products, eq(transactionDetails.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...detailConditions));

    // Aggregate category data & top products
    const categoryMap: Record<string, number> = {};
    const productSalesMap: Record<string, { sold: number, revenue: number }> = {};
    
    // We will estimate net profit globally as 20% if we can't track it granularly per product cost.
    // For a more exact metric we would look up purchasePrice. Here we use a generic 20% margin approximation.
    const AVG_MARGIN = 0.20;
    let totalNetProfit = 0;

    for (const d of allDetails) {
        const rowTotal = parseFloat(String(d.total) || '0');
        const dDate = new Date(d.transDate);
        const monthKey = `${monthNames[dDate.getMonth()]} ${dDate.getFullYear()}`;

        // Monthly Aggregation
        if (!monthlyDataMap[monthKey]) {
            monthlyDataMap[monthKey] = { sales: 0, profit: 0 };
        }
        monthlyDataMap[monthKey].sales += rowTotal;
        const estimatedProfit = rowTotal * AVG_MARGIN;
        monthlyDataMap[monthKey].profit += estimatedProfit;
        totalNetProfit += estimatedProfit;

        // Category Aggregation
        const catName = d.categoryName || 'Uncategorized';
        categoryMap[catName] = (categoryMap[catName] || 0) + rowTotal;

        // Product Aggregation
        const pName = d.productName;
        if (!productSalesMap[pName]) productSalesMap[pName] = { sold: 0, revenue: 0 };
        productSalesMap[pName].sold += d.qty;
        productSalesMap[pName].revenue += rowTotal;
    }

    // Convert Aggregations to Arrays
    // Only keeping the last 6 months for the chart
    const salesData = Object.keys(monthlyDataMap)
        .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-6)
        .map(key => ({
            name: key.split(' ')[0], 
            sales: monthlyDataMap[key].sales,
            profit: monthlyDataMap[key].profit
        }));

    const categoryData = Object.keys(categoryMap).map(k => ({
        name: k,
        value: categoryMap[k]
    })).sort((a,b) => b.value - a.value);

    const topProducts = Object.keys(productSalesMap).map(k => ({
        name: k,
        sold: productSalesMap[k].sold,
        revenue: productSalesMap[k].revenue
    })).sort((a,b) => b.revenue - a.revenue).slice(0, 5); // top 5

    // 3. Inventory Value Estimation
    let invQuery = db.select({
      qty: inventory.quantity,
      price: productPrices.purchasePrice
    })
    .from(inventory)
    .leftJoin(productPrices, eq(inventory.productId, productPrices.productId));

    if (invBranchCond) {
        invQuery = invQuery.where(invBranchCond) as any;
    }

    const inventoryData = await invQuery;
    
    // We distinct products prices, but if a product has no tracked price we guess its value.
    let inventoryValue = 0;
    for (const item of inventoryData) {
        const q = item.qty || 0;
        const p = parseFloat(String(item.price) || '0') || 0; // if no cost tracked, it evaluates to 0
        inventoryValue += (q * p);
    }

    // 4. Customers Count (Members)
    const membersCountResult = await db.select({ count: sql<number>`count(*)` }).from(members);
    const customersCount = Number(membersCountResult[0].count);

    return new Response(JSON.stringify({
        success: true,
        data: {
            stats: {
                totalRevenue,
                netProfit: totalNetProfit,
                transactionsCount,
                inventoryValue,
                customersCount
            },
            salesData,
            categoryData,
            topProducts
        }
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
