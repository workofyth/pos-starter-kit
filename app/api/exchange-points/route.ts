import { NextRequest } from 'next/server';
import { db } from '@/db';
import { exchangePoints, products } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
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

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search parameters
    const search = searchParams.get('search') || '';
    
    // Build query conditions
    const whereConditions = [eq(exchangePoints.storeId, session.user.storeId)];
    if (search) {
      whereConditions.push(ilike(exchangePoints.exchangeItem, `%${search}%`));
    }

    const list = await db
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
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(exchangePoints.createdAt));
    
    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(exchangePoints)
      .where(and(...whereConditions));
    
    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: list,
        pagination: { page, limit, totalCount, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching exchange points:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { pointExchangeTotal, exchangeItem, productId } = body;
    
    if (!pointExchangeTotal || !exchangeItem) {
      return new Response(JSON.stringify({ success: false, message: 'Point total and exchange item are required' }), { status: 400 });
    }

    // Validate product belongs to store if provided
    if (productId) {
      const productExists = await db.select({ id: products.id }).from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, session.user.storeId)))
        .limit(1);
      if (productExists.length === 0) {
        return new Response(JSON.stringify({ success: false, message: 'Product not found in your store' }), { status: 403 });
      }
    }
    
    const id = `exp_${nanoid(10)}`;
    const [newItem] = await db
      .insert(exchangePoints)
      .values({
        id,
        storeId: session.user.storeId,
        pointExchangeTotal: parseInt(pointExchangeTotal.toString()),
        exchangeItem,
        productId: productId || null,
      })
      .returning();
    
    return new Response(JSON.stringify({ success: true, data: newItem }), { status: 201 });
  } catch (error) {
    console.error('Error creating exchange point:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}
