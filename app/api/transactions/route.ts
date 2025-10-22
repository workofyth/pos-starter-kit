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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const branchId = searchParams.get('branchId') || '';
    const userId = searchParams.get('userId') || ''; // User ID to check role
    const cashierId = searchParams.get('cashierId') || '';
    const memberId = searchParams.get('memberId') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Check if user is admin by checking user role in userBranches
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
    
    // First, get transactions with basic info
    let transactionsQuery = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    // Only apply branch filter if user is not admin
    if (branchId && !isAdmin) {
      whereConditions.push(eq(transactions.branchId, branchId));
    }
    
    if (cashierId) {
      whereConditions.push(eq(transactions.cashierId, cashierId));
    }
    
    if (memberId) {
      whereConditions.push(eq(transactions.memberId, memberId));
    }
    
    if (status) {
      whereConditions.push(eq(transactions.status, status as any));
    }
    
    if (whereConditions.length > 0) {
      transactionsQuery = transactionsQuery.where(and(...whereConditions)) as typeof transactionsQuery;
    }
    
    const rawTransactions = await transactionsQuery;
    
    // Now fetch related data and details count for each transaction
    const transactionsList = [];
    
    for (const trans of rawTransactions) {
      // Get count of transaction details
      const detailsCountResult = await db
        .select({ count: count() })
        .from(transactionDetails)
        .where(eq(transactionDetails.transactionId, trans.id));
      
      const detailsCount = detailsCountResult[0].count as number || 0;
      
      // Get cashier name
      let cashierName = 'Unknown';
      if (trans.cashierId) {
        const cashierResult = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, trans.cashierId))
          .limit(1);
        if (cashierResult.length > 0) {
          cashierName = cashierResult[0].name || 'Unknown';
        }
      }
      
      // Get member name
      let memberName = 'Walk-in Customer';
      if (trans.memberId) {
        const memberResult = await db
          .select({ name: members.name })
          .from(members)
          .where(eq(members.id, trans.memberId))
          .limit(1);
        if (memberResult.length > 0) {
          memberName = memberResult[0].name || 'Walk-in Customer';
        }
      }
      
      // Get branch name
      let branchName = 'Unknown Branch';
      if (trans.branchId) {
        const branchResult = await db
          .select({ name: branches.name })
          .from(branches)
          .where(eq(branches.id, trans.branchId))
          .limit(1);
        if (branchResult.length > 0) {
          branchName = branchResult[0].name || 'Unknown Branch';
        }
      }
      
      transactionsList.push({
        id: trans.id,
        transactionNumber: trans.transactionNumber,
        branchId: trans.branchId,
        cashierId: trans.cashierId,
        memberId: trans.memberId,
        status: trans.status,
        subtotal: String(trans.subtotal || '0'),
        discountAmount: String(trans.discountAmount || '0'),
        taxAmount: String(trans.taxAmount || '0'),
        total: String(trans.total || '0'),
        paidAmount: String(trans.paidAmount || '0'),
        changeAmount: String(trans.changeAmount || '0'),
        paymentMethod: trans.paymentMethod,
        notes: trans.notes,
        createdAt: trans.createdAt,
        updatedAt: trans.updatedAt,
        detailsCount,
        cashierName,
        memberName,
        branchName
      });
    }
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(transactions);
    
    let countWhereConditions = [];
    
    // Only apply branch filter to count query if user is not admin
    if (branchId && !isAdmin) {
      countWhereConditions.push(eq(transactions.branchId, branchId));
    }
    
    if (cashierId) {
      countWhereConditions.push(eq(transactions.cashierId, cashierId));
    }
    
    if (memberId) {
      countWhereConditions.push(eq(transactions.memberId, memberId));
    }
    
    if (status) {
      countWhereConditions.push(eq(transactions.status, status as any));
    }
    
    if (countWhereConditions.length > 0) {
      countQuery = countQuery.where(and(...countWhereConditions));
    }
    
    const totalCountResult = await countQuery;
    // Handle the count result which may be in different formats depending on the database driver
    const countValue = totalCountResult[0].count;
    const totalCount = typeof countValue === 'number' ? countValue : parseInt(countValue as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: transactionsList,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
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