import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  members, 
  user,
  branches,
  userBranches
} from '@/db/schema/pos';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "No store associated with user" }), { status: 400 });
    }

    const storeId = session.user.storeId;
    const { searchParams } = new URL(request.url);
    
    const branchId = searchParams.get('branchId') || '';
    const cashierId = searchParams.get('cashierId') || '';
    const memberId = searchParams.get('memberId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const whereConditions = [eq(transactions.storeId, storeId)];
    
    if (branchId) whereConditions.push(eq(transactions.branchId, branchId));
    if (cashierId) whereConditions.push(eq(transactions.cashierId, cashierId));
    if (memberId) whereConditions.push(eq(transactions.memberId, memberId));
    if (status) whereConditions.push(eq(transactions.status, status as any));
    
    // Fetch transactions
    const rawTransactions = await db
      .select()
      .from(transactions)
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    const transactionsList = [];
    
    for (const trans of rawTransactions) {
      // Scoped detail count
      const detailsCountResult = await db
        .select({ count: count() })
        .from(transactionDetails)
        .where(and(eq(transactionDetails.transactionId, trans.id), eq(transactionDetails.storeId, storeId)));
      
      const detailsCount = Number(detailsCountResult[0].count);
      
      // Scoped cashier resolution
      let cashierName = 'Unknown';
      if (trans.cashierId) {
        const cashierResult = await db.select({ name: user.name }).from(user).where(eq(user.id, trans.cashierId)).limit(1);
        if (cashierResult.length > 0) cashierName = cashierResult[0].name || 'Unknown';
      }
      
      // Scoped member resolution
      let memberName = 'Walk-in Customer';
      if (trans.memberId) {
        const memberResult = await db.select({ name: members.name }).from(members).where(and(eq(members.id, trans.memberId), eq(members.storeId, storeId))).limit(1);
        if (memberResult.length > 0) memberName = memberResult[0].name || 'Walk-in Customer';
      }
      
      // Scoped branch resolution
      let branchName = 'Unknown Branch';
      if (trans.branchId) {
        const branchResult = await db.select({ name: branches.name }).from(branches).where(and(eq(branches.id, trans.branchId), eq(branches.storeId, storeId))).limit(1);
        if (branchResult.length > 0) branchName = branchResult[0].name || 'Unknown Branch';
      }
      
      transactionsList.push({
        ...trans,
        detailsCount,
        cashierName,
        memberName,
        branchName
      });
    }
    
    // Total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(and(...whereConditions));
    
    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: transactionsList,
        pagination: { page, limit, totalCount, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}