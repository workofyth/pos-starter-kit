import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    const branchId = searchParams.get('branchId') || ''; // Add branchId parameter
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
    
    // Build the query
    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        unit: products.unit,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        sellingPrice: productPrices.sellingPrice,
        purchasePrice: productPrices.purchasePrice,
        stock: inventory.quantity,
        minStock: inventory.minStock,
        branchId: inventory.branchId  // Include branchId in the response
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .groupBy(
        products.id,
        categories.name,
        productPrices.sellingPrice,
        productPrices.purchasePrice,
        inventory.quantity,
        inventory.minStock,
        inventory.branchId
      )
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`));
    }
    
    if (category) {
      whereConditions.push(eq(categories.code, category));
    }
    
    if (minPrice || maxPrice) {
      if (minPrice) {
        whereConditions.push(sql`${productPrices.sellingPrice} >= ${minPrice}`);
      }
      if (maxPrice) {
        whereConditions.push(sql`${productPrices.sellingPrice} <= ${maxPrice}`);
      }
    }
    
    if (inStock === 'true') {
      whereConditions.push(sql`${inventory.quantity} > 0`);
    } else if (inStock === 'false') {
      whereConditions.push(sql`${inventory.quantity} <= 0`);
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
    let countQuery : any= db
      .select({ count: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId));
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(ilike(products.name, `%${search}%`));
    }
    
    if (category) {
      countWhereConditions.push(eq(categories.code, category));
    }
    
    if (minPrice || maxPrice) {
      if (minPrice) {
        countWhereConditions.push(sql`${productPrices.sellingPrice} >= ${minPrice}`);
      }
      if (maxPrice) {
        countWhereConditions.push(sql`${productPrices.sellingPrice} <= ${maxPrice}`);
      }
    }
    
    if (inStock === 'true') {
      countWhereConditions.push(sql`${inventory.quantity} > 0`);
    } else if (inStock === 'false') {
      countWhereConditions.push(sql`${inventory.quantity} <= 0`);
    }
    
    if (branchId) {
      countWhereConditions.push(eq(inventory.branchId, branchId));
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