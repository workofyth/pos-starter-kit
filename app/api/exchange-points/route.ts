import { NextRequest } from 'next/server';
import { db } from '@/db';
import { exchangePoints, products } from '@/db/schema/pos';
import { eq, ilike, desc, asc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search parameters
    const search = searchParams.get('search') || '';
    
    // Build query
    let query = db
      .select({
        id: exchangePoints.id,
        pointExchangeTotal: exchangePoints.pointExchangeTotal,
        exchangeItem: exchangePoints.exchangeItem,
        productId: exchangePoints.productId,
        createdAt: exchangePoints.createdAt,
        updatedAt: exchangePoints.updatedAt,
        productName: products.name,
      })
      .from(exchangePoints)
      .leftJoin(products, eq(exchangePoints.productId, products.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(exchangePoints.createdAt));
    
    // Apply search filter
    if (search) {
      query = query.where(
        ilike(exchangePoints.exchangeItem, `%${search}%`)
      ) as typeof query;
    }
    
    const list = await query;
    
    // Get total count
    let countQuery = db
      .select({ count: count() })
      .from(exchangePoints);
    
    if (search) {
       countQuery = countQuery.where(ilike(exchangePoints.exchangeItem, `%${search}%`)) as typeof countQuery;
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: list,
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
    console.error('Error fetching exchange points:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pointExchangeTotal, exchangeItem, productId } = body;
    
    if (!pointExchangeTotal || !exchangeItem) {
      return new Response(
        JSON.stringify({ success: false, message: 'Point total and exchange item are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const id = `exp_${nanoid(10)}`;
    const [newItem] = await db
      .insert(exchangePoints)
      .values({
        id,
        pointExchangeTotal: parseInt(pointExchangeTotal.toString()),
        exchangeItem,
        productId: productId || null,
      })
      .returning();
    
    return new Response(
      JSON.stringify({ success: true, data: newItem }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating exchange point:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
