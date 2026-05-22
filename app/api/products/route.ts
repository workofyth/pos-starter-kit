import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories, branches } from '@/db/schema/pos';
import { eq, and, or, isNull, ilike, desc, asc, count, sql, inArray } from 'drizzle-orm';
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

    const storeId = session.user.storeId;
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search parameters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    let branchId = searchParams.get('branchId') || '';
    if (branchId === 'null' || branchId === 'undefined') branchId = '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build filter conditions
    const whereConditions = [eq(products.storeId, storeId)];
    if (search) whereConditions.push(ilike(products.name, `%${search}%`));
    
    // We use subqueries for stock and prices to avoid join multiplication
    const stockSubquery = db
      .select({
        productId: inventory.productId,
        totalStock: sql<number>`CAST(SUM(${inventory.quantity}) AS INTEGER)`.as('total_stock'),
        maxMinStock: sql<number>`MAX(${inventory.minStock})`.as('max_min_stock')
      })
      .from(inventory)
      .where(and(
        branchId ? eq(inventory.branchId, branchId) : sql`1=1`,
        inArray(inventory.branchId, db.select({ id: branches.id }).from(branches).where(eq(branches.storeId, storeId)))
      ))
      .groupBy(inventory.productId)
      .as('stock_sub');

    const priceSubquery = db
      .selectDistinctOn([productPrices.productId], {
        productId: productPrices.productId,
        sellingPrice: productPrices.sellingPrice,
        customerPrice: productPrices.customerPrice,
        purchasePrice: productPrices.purchasePrice,
        effectiveDate: productPrices.effectiveDate,
        branchId: productPrices.branchId,
      })
      .from(productPrices)
      .where(sql`1=1`)
      .orderBy(
        productPrices.productId, 
        asc(sql`CASE 
          WHEN ${productPrices.branchId} = ${branchId} THEN 0 
          WHEN ${productPrices.branchId} IS NULL THEN 1 
          ELSE 2 END`),
        desc(productPrices.effectiveDate)
      )
      .as('price_sub');

    // Category filter logic
    let categoryCondition = sql`1=1`;
    if (category) {
      categoryCondition = eq(categories.code, category);
    }

    // Determine sorting
    let orderByColumn;
    if (sortBy === 'name') {
      orderByColumn = sortOrder === 'asc' ? asc(products.name) : desc(products.name);
    } else if (sortBy === 'createdAt') {
      orderByColumn = sortOrder === 'asc' ? asc(products.createdAt) : desc(products.createdAt);
    } else if (sortBy === 'sellingPrice') {
      orderByColumn = sortOrder === 'asc' ? asc(priceSubquery.sellingPrice) : desc(priceSubquery.sellingPrice);
    } else if (sortBy === 'stock') {
      orderByColumn = sortOrder === 'asc' ? asc(stockSubquery.totalStock) : desc(stockSubquery.totalStock);
    } else {
      orderByColumn = desc(products.createdAt);
    }

    const productList = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        unit: products.unit,
        brand: products.brand,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        sellingPrice: priceSubquery.sellingPrice,
        customerPrice: priceSubquery.customerPrice,
        purchasePrice: priceSubquery.purchasePrice,
        stock: sql<number>`COALESCE(${stockSubquery.totalStock}, 0)`,
        minStock: sql<number>`COALESCE(${stockSubquery.maxMinStock}, 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId))
      .where(and(...whereConditions, categoryCondition))
      .orderBy(orderByColumn)
      .limit(limit)
      .offset(offset);
    
    // Total count query
    const countConditions = [eq(products.storeId, storeId)];
    if (search) countConditions.push(ilike(products.name, `%${search}%`));
    
    let totalCountQuery = db.select({ count: count(products.id) }).from(products);
    
    if (category) {
      totalCountQuery = totalCountQuery.leftJoin(categories, eq(products.categoryId, categories.id)) as any;
      countConditions.push(eq(categories.code, category));
    }
    
    if (branchId) {
      totalCountQuery = totalCountQuery.leftJoin(inventory, eq(products.id, inventory.productId)) as any;
      countConditions.push(eq(inventory.branchId, branchId));
    }
    
    const totalCountResult = await totalCountQuery.where(and(...countConditions));
    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: productList,
        pagination: { page, limit, totalCount, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
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

    const storeId = session.user.storeId;
    const body = await request.json();
    const {
      name, description, sku, barcode, image, imageUrl, categoryId, brand,
      unit = 'pcs', profitMargin = '0.00', purchasePrice = '0',
      sellingPrice = '0', customerPrice = '0', stock = 0, minStock = 5
    } = body;
    
    if (!name || !sku || !barcode) {
      return new Response(JSON.stringify({ success: false, message: 'Name, SKU, and barcode are required' }), { status: 400 });
    }
    
    let finalSku = sku;
    const existingSku = await db.select().from(products).where(and(eq(products.sku, finalSku), eq(products.storeId, storeId)));
    
    if (existingSku.length > 0) {
        let counter = 1;
        let tempSku = `${sku}_${counter}`;
        while ((await db.select().from(products).where(and(eq(products.sku, tempSku), eq(products.storeId, storeId)))).length > 0) {
          counter++;
          tempSku = `${sku}_${counter}`;
        }
        finalSku = tempSku;
    }

    const existingProductByBarcode = await db.select().from(products).where(and(eq(products.barcode, barcode), eq(products.storeId, storeId)));
    if (existingProductByBarcode.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Product with this barcode already exists in your store' }), { status: 409 });
    }
    
    const productId = `prod_${nanoid(10)}`;
    let targetBranchId: string | null = body.branchId || null;
    
    let validCategoryId = categoryId;
    if (categoryId) {
      const categoryExists = await db.select({ id: categories.id }).from(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.storeId, storeId)))
        .limit(1);
      if (categoryExists.length === 0) validCategoryId = null;
    }

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id: productId,
        storeId,
        name, description, sku: finalSku, barcode, image, imageUrl, categoryId: validCategoryId, unit, profitMargin
      });
      
      if (purchasePrice !== '0' || sellingPrice !== '0' || customerPrice !== '0') {
        await tx.insert(productPrices).values({
          id: `pp_${nanoid(10)}`,
          storeId,
          productId,
          branchId: targetBranchId,
          purchasePrice: purchasePrice.toString(),
          sellingPrice: sellingPrice.toString(),
          customerPrice: customerPrice.toString(),
          effectiveDate: new Date(),
          createdAt: new Date()
        });
      }
      
      let inventoryBranchId = targetBranchId;
      if (!inventoryBranchId) {
        const branchList = await tx.select({ id: branches.id }).from(branches).where(eq(branches.storeId, storeId)).limit(1);
        if (branchList.length > 0) inventoryBranchId = branchList[0].id;
      }

      if (inventoryBranchId) {
        await tx.insert(inventory).values({
          id: `inv_${nanoid(10)}`,
          storeId,
          productId,
          branchId: inventoryBranchId,
          quantity: stock,
          minStock,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
    
    const [createdProduct] = await db.select({
        id: products.id, name: products.name, description: products.description, sku: products.sku,
        barcode: products.barcode, image: products.image, imageUrl: products.imageUrl, unit: products.unit,
        profitMargin: products.profitMargin, createdAt: products.createdAt, updatedAt: products.updatedAt,
        categoryId: products.categoryId, categoryName: categories.name,
        sellingPrice: productPrices.sellingPrice, customerPrice: productPrices.customerPrice,
        purchasePrice: productPrices.purchasePrice, stock: inventory.quantity, minStock: inventory.minStock
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, productId))
      .limit(1);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Product created successfully', data: createdProduct }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}