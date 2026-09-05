import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories, branches } from '@/db/schema/pos';
import { eq, and, or, ilike, desc, asc, count, sql, SQL, inArray } from 'drizzle-orm';
import { requireOnboarded, subscriptionGuardResponse } from '@/lib/subscription-guard';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { searchParams } = new URL(request.url);

    const search = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const barcode = (searchParams.get('barcode') || '').trim();
    const category = (searchParams.get('category') || searchParams.get('categoryId') || '').trim();
    const brand = (searchParams.get('brand') || '').trim();
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    
    let branchId = searchParams.get('branchId') || '';
    if (branchId === 'null' || branchId === 'undefined') branchId = '';

    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Subquery for branch/store inventory stock
    const stockSubquery = db
      .select({
        productId: inventory.productId,
        totalStock: sql<number>`CAST(COALESCE(SUM(${inventory.quantity}), 0) AS INTEGER)`.as('total_stock'),
        maxMinStock: sql<number>`CAST(COALESCE(MAX(${inventory.minStock}), 0) AS INTEGER)`.as('max_min_stock')
      })
      .from(inventory)
      .where(and(
        eq(inventory.storeId, storeId),
        branchId ? eq(inventory.branchId, branchId) : sql`1=1`
      ))
      .groupBy(inventory.productId)
      .as('stock_sub');

    // Subquery for effective product prices (branch-specific priority, fallback to general price)
    const priceSubquery = db
      .selectDistinctOn([productPrices.productId], {
        productId: productPrices.productId,
        sellingPrice: productPrices.sellingPrice,
        customerPrice: productPrices.customerPrice,
        purchasePrice: productPrices.purchasePrice,
        effectiveDate: productPrices.effectiveDate,
      })
      .from(productPrices)
      .where(eq(productPrices.storeId, storeId))
      .orderBy(
        productPrices.productId,
        asc(sql`CASE 
          WHEN ${productPrices.branchId} = ${branchId} THEN 0 
          WHEN ${productPrices.branchId} IS NULL THEN 1 
          ELSE 2 END`),
        desc(productPrices.effectiveDate)
      )
      .as('price_sub');

    // Base query
    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        brand: products.brand,
        unit: products.unit,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categoryCode: categories.code,
        sellingPrice: sql<string>`COALESCE(${priceSubquery.sellingPrice}, '0.00')`,
        customerPrice: sql<string>`COALESCE(${priceSubquery.customerPrice}, '0.00')`,
        purchasePrice: sql<string>`COALESCE(${priceSubquery.purchasePrice}, '0.00')`,
        stock: sql<number>`COALESCE(${stockSubquery.totalStock}, 0)`,
        minStock: sql<number>`COALESCE(${stockSubquery.maxMinStock}, 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId));

    // Build filter conditions
    const whereConditions: (SQL<unknown> | undefined)[] = [eq(products.storeId, storeId)];

    if (barcode) {
      whereConditions.push(eq(products.barcode, barcode));
    } else if (search) {
      whereConditions.push(or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.barcode, `%${search}%`),
        ilike(products.brand, `%${search}%`)
      ));
    }

    if (brand) {
      whereConditions.push(ilike(products.brand, `%${brand}%`));
    }

    if (category) {
      whereConditions.push(or(
        eq(products.categoryId, category),
        eq(categories.code, category),
        ilike(categories.name, `%${category}%`)
      ));
    }

    if (minPrice) {
      whereConditions.push(sql`CAST(${priceSubquery.sellingPrice} AS NUMERIC) >= ${minPrice}`);
    }
    if (maxPrice) {
      whereConditions.push(sql`CAST(${priceSubquery.sellingPrice} AS NUMERIC) <= ${maxPrice}`);
    }

    if (inStock === 'true') {
      whereConditions.push(sql`COALESCE(${stockSubquery.totalStock}, 0) > 0`);
    } else if (inStock === 'false') {
      whereConditions.push(sql`COALESCE(${stockSubquery.totalStock}, 0) <= 0`);
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }

    // Determine sorting
    let orderByClause;
    if (sortBy === 'name') {
      orderByClause = sortOrder === 'desc' ? desc(products.name) : asc(products.name);
    } else if (sortBy === 'sellingPrice') {
      orderByClause = sortOrder === 'desc' ? desc(priceSubquery.sellingPrice) : asc(priceSubquery.sellingPrice);
    } else if (sortBy === 'stock') {
      orderByClause = sortOrder === 'desc' ? desc(stockSubquery.totalStock) : asc(stockSubquery.totalStock);
    } else {
      orderByClause = sortOrder === 'asc' ? asc(products.createdAt) : desc(products.createdAt);
    }

    query = query.orderBy(orderByClause).limit(limit).offset(offset) as typeof query;

    const searchResults = await query;

    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId));

    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions)) as typeof countQuery;
    }

    const totalCountResult = await countQuery;
    const countValue = totalCountResult[0]?.count ?? 0;
    const totalCount = typeof countValue === 'number' ? countValue : parseInt(countValue as string, 10);
    const totalPages = Math.ceil(totalCount / limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: searchResults,
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
    console.error('Error searching products:', error);
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