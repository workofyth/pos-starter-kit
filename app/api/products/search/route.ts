import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories } from '@/db/schema/pos';
import { eq, and, or, isNull, ilike, desc, asc, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    let branchId = searchParams.get('branchId') || '';
    if (branchId === 'null' || branchId === 'undefined') branchId = ''; // Handle stringified null/undefined from JS
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    if (!search && !category && !minPrice && !maxPrice && inStock === null && !branchId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'At least one search parameter is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Build subqueries for stock and prices
    const stockSubquery = db
      .select({
        productId: inventory.productId,
        totalStock: sql<number>`CAST(SUM(${inventory.quantity}) AS INTEGER)`.as('total_stock'),
        maxMinStock: sql<number>`MAX(${inventory.minStock})`.as('max_min_stock')
      })
      .from(inventory)
      .where(branchId ? eq(inventory.branchId, branchId) : sql`1=1`)
      .groupBy(inventory.productId)
      .as('stock_sub');

    const priceSubquery = db
      .selectDistinctOn([productPrices.productId], {
        productId: productPrices.productId,
        sellingPrice: productPrices.sellingPrice,
        purchasePrice: productPrices.purchasePrice,
        effectiveDate: productPrices.effectiveDate,
      })
      .from(productPrices)
      .where(sql`1=1`) // Include all prices for fallback
      .orderBy(
        productPrices.productId,
        asc(sql`CASE 
          WHEN ${productPrices.branchId} = ${branchId} THEN 0 
          WHEN ${productPrices.branchId} IS NULL THEN 1 
          ELSE 2 END`),
        desc(productPrices.effectiveDate)
      )
      .as('price_sub');

    // Build the main query
    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        brand: products.brand,
        imageUrl: products.imageUrl,
        unit: products.unit,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        sellingPrice: priceSubquery.sellingPrice,
        purchasePrice: priceSubquery.purchasePrice,
        stock: sql<number>`COALESCE(${stockSubquery.totalStock}, 0)`,
        minStock: sql<number>`COALESCE(${stockSubquery.maxMinStock}, 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(or(
        ilike(products.name, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.barcode, `%${search}%`)
      ));
    }
    
    if (category) {
      whereConditions.push(eq(categories.code, category));
    }
    
    if (minPrice || maxPrice) {
      if (minPrice) {
        whereConditions.push(sql`${priceSubquery.sellingPrice} >= ${minPrice}`);
      }
      if (maxPrice) {
        whereConditions.push(sql`${priceSubquery.sellingPrice} <= ${maxPrice}`);
      }
    }
    
    if (inStock === 'true') {
      whereConditions.push(sql`${stockSubquery.totalStock} > 0`);
    } else if (inStock === 'false') {
      whereConditions.push(sql`${stockSubquery.totalStock} <= 0`);
    }
    
    if (branchId) {
      whereConditions.push(eq(inventory.branchId, branchId));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    query = query.orderBy(desc(products.createdAt)) as typeof query;
    
    const searchResults = await query;
    
    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId));
    
    const countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(or(
        ilike(products.name, `%${search}%`),
        ilike(products.brand, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.barcode, `%${search}%`)
      ));
    }
    
    if (category) {
      countWhereConditions.push(eq(categories.code, category));
    }
    
    if (minPrice || maxPrice) {
      if (minPrice) {
        countWhereConditions.push(sql`${priceSubquery.sellingPrice} >= ${minPrice}`);
      }
      if (maxPrice) {
        countWhereConditions.push(sql`${priceSubquery.sellingPrice} <= ${maxPrice}`);
      }
    }
    
    if (inStock === 'true') {
      countWhereConditions.push(sql`${stockSubquery.totalStock} > 0`);
    } else if (inStock === 'false') {
      countWhereConditions.push(sql`${stockSubquery.totalStock} <= 0`);
    }
    
    if (branchId) {
      countWhereConditions.push(eq(inventory.branchId, branchId));
    }
    
    if (countWhereConditions.length > 0) {
      countQuery = countQuery.where(and(...countWhereConditions)) as typeof countQuery;
    }
    
    const totalCountResult = await countQuery;
    // Handle the count result which may be in different formats depending on the database driver
    const countValue = totalCountResult[0].count;
    const totalCount = typeof countValue === 'number' ? countValue : parseInt(countValue as string);
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