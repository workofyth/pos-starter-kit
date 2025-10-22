import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventoryTransactions, products, branches, user } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { inventory } from '@/db/schema/pos';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const productId = searchParams.get('productId') || '';
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query with joins
    let query = db
      .select({
        id: inventoryTransactions.id,
        productId: inventoryTransactions.productId,
        branchId: inventoryTransactions.branchId,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        referenceId: inventoryTransactions.referenceId,
        notes: inventoryTransactions.notes,
        createdAt: inventoryTransactions.createdAt,
        createdBy: inventoryTransactions.createdBy,
        productName: products.name,
        productSku: products.sku,
        branchName: branches.name,
        userName: user.name
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .leftJoin(user, eq(inventoryTransactions.createdBy, user.id))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        ilike(products.name, `%${search}%`)
      );
    }
    
    if (branchId) {
      whereConditions.push(eq(inventoryTransactions.branchId, branchId));
    }
    
    if (productId) {
      whereConditions.push(eq(inventoryTransactions.productId, productId));
    }
    
    if (type) {
      type TransactionType = (typeof inventoryTransactions.type.enumValues)[number];
      const txType = type as TransactionType;
      whereConditions.push(eq(inventoryTransactions.type, txType));
    }
    
    if (startDate) {
      whereConditions.push(
        sql`${inventoryTransactions.createdAt} >= ${startDate}`
      );
    }
    
    if (endDate) {
      whereConditions.push(
        sql`${inventoryTransactions.createdAt} <= ${endDate}`
      );
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'productName') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(products.name)) as typeof query
        : query.orderBy(desc(products.name)) as typeof query;
    } else if (sortBy === 'branchName') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(branches.name)) as typeof query
        : query.orderBy(desc(branches.name)) as typeof query;
    } else if (sortBy === 'quantity') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventoryTransactions.quantity)) as typeof query 
        : query.orderBy(desc(inventoryTransactions.quantity)) as typeof query;
    } else if (sortBy === 'type') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventoryTransactions.type)) as typeof query 
        : query.orderBy(desc(inventoryTransactions.type)) as typeof query;
    } else {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventoryTransactions.createdAt)) as typeof query
        : query.orderBy(desc(inventoryTransactions.createdAt)) as typeof query;
    }
    
    const transactionsList = await query;
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .leftJoin(branches, eq(inventoryTransactions.branchId, branches.id));
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(
        ilike(products.name, `%${search}%`)
      );
    }
    
    if (branchId) {
      countWhereConditions.push(eq(inventoryTransactions.branchId, branchId));
    }
    
    if (productId) {
      countWhereConditions.push(eq(inventoryTransactions.productId, productId));
    }
    
    if (type) {
      type TransactionType = (typeof inventoryTransactions.type.enumValues)[number];
      const txType = type as TransactionType;
      countWhereConditions.push(eq(inventoryTransactions.type, txType));
    }
    
    if (startDate) {
      countWhereConditions.push(
        sql`${inventoryTransactions.createdAt} >= ${startDate}`
      );
    }
    
    if (endDate) {
      countWhereConditions.push(
        sql`${inventoryTransactions.createdAt} <= ${endDate}`
      );
    }
    
    if (countWhereConditions.length > 0) {
      countQuery = countQuery.where(and(...countWhereConditions));
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
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
    console.error('Error fetching inventory transactions:', error);
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