import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products,
  userBranches
} from '@/db/schema/pos';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // User role evaluation
    const userId = searchParams.get('userId') || '';
    const branchId = searchParams.get('branchId') || '';
    
    let isAdmin = false;
    if (userId) {
      const userBranchesResult = await db
        .select({ role: userBranches.role })
        .from(userBranches)
        .where(eq(userBranches.userId, userId));
      
      if (userBranchesResult.length > 0) {
        isAdmin = userBranchesResult[0].role === 'admin';
      }
    }

    const whereConditions = [];
    if (branchId && !isAdmin) {
      whereConditions.push(eq(transactions.branchId, branchId));
    }

    // Dynamic where application
    let queryBase = db
      .select({
        id: transactionDetails.id,
        transactionId: transactions.id,
        transactionNumber: transactions.transactionNumber,
        date: transactions.createdAt,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        quantity: transactionDetails.quantity,
        unitPrice: transactionDetails.unitPrice,
        totalPrice: transactionDetails.totalPrice,
      })
      .from(transactionDetails)
      .innerJoin(transactions, eq(transactionDetails.transactionId, transactions.id))
      .leftJoin(products, eq(transactionDetails.productId, products.id));

    if (whereConditions.length > 0) {
      queryBase = queryBase.where(and(...whereConditions)) as any;
    }

    const results = await queryBase.orderBy(desc(transactions.createdAt)).limit(100);

    return new Response(
      JSON.stringify({
        success: true,
        data: results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching transaction products:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
