import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories, branches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
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
    const category = searchParams.get('category') || '';
    const branchId = searchParams.get('branchId') || ''; // Add branchId parameter
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build query with joins
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
        branchId: inventory.branchId // Include branchId in the response
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
    
    // Apply search filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`));
    }
    
    if (category) {
      whereConditions.push(eq(categories.code, category));
    }
    
    if (branchId) {
      whereConditions.push(eq(inventory.branchId, branchId));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(products.name)) as typeof query
        : query.orderBy(desc(products.name)) as typeof query;
    } else if (sortBy === 'createdAt') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(products.createdAt)) as typeof query
        : query.orderBy(desc(products.createdAt)) as typeof query;
    } else if (sortBy === 'sellingPrice') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(productPrices.sellingPrice)) as typeof query
        : query.orderBy(desc(productPrices.sellingPrice)) as typeof query;
    } else if (sortBy === 'stock') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventory.quantity)) as typeof query
        : query.orderBy(desc(inventory.quantity)) as typeof query;
    } else {
      query = query.orderBy(desc(products.createdAt)) as typeof query;
    }
    
    const productList = await query;
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(inventory, eq(products.id, inventory.productId));
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(ilike(products.name, `%${search}%`));
    }
    
    if (category) {
      countWhereConditions.push(eq(categories.code, category));
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
        data: productList,
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
    console.error('Error fetching products:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      sku,
      barcode,
      image,
      imageUrl,
      categoryId,
      unit = 'pcs',
      profitMargin = '0.00',
      purchasePrice = '0',
      sellingPrice = '0',
      stock = 0,
      minStock = 5
    } = body;
    
    // Validate required fields
    if (!name || !sku || !barcode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Name, SKU, and barcode are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check for duplicate SKU and auto-generate if it exists
    let finalSku = sku;
    let skuExists = true;
    let skuNumber = 0;
    
    // If SKU has a numeric suffix (like ABC00001), we'll increment it
    const skuMatch = sku.match(/^(.*?)(\d+)$/);
    if (skuMatch) {
      const prefix = skuMatch[1];
      skuNumber = parseInt(skuMatch[2]);
      
      // Check if the original SKU exists
      let existingSku = await db
        .select()
        .from(products)
        .where(eq(products.sku, finalSku));
      
      // If it exists, increment until we find a unique SKU
      while (existingSku.length > 0) {
        skuNumber++;
        finalSku = prefix + String(skuNumber).padStart(skuMatch[2].length, '0');
        existingSku = await db
          .select()
          .from(products)
          .where(eq(products.sku, finalSku));
      }
    } else {
      // For non-numeric SKUs, check directly
      const existingProductBySku = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku));
      
      if (existingProductBySku.length > 0) {
        // For non-numeric SKU, append a number to make it unique
        let counter = 1;
        let tempSku = `${sku}_${counter}`;
        while ((await db.select().from(products).where(eq(products.sku, tempSku))).length > 0) {
          counter++;
          tempSku = `${sku}_${counter}`;
        }
        finalSku = tempSku;
      }
    }

    // Check for duplicate barcode
    const existingProductByBarcode = await db
      .select()
      .from(products)
      .where(
        eq(products.barcode, barcode)
      );
    
    if (existingProductByBarcode.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product with this barcode already exists' 
        }),
        { 
          status: 409, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const productId = `prod_${nanoid(10)}`;
    
    // First, get a valid branch ID or handle appropriately
    let branchId: string | null = null;
    try {
      // Attempt to get an existing branch
      const branchList = await db.select({ id: branches.id }).from(branches).limit(1);
      if (branchList.length > 0) {
        branchId = branchList[0].id;
      }
    } catch (error) {
      console.log('No branches found or error querying branches, will use null');
    }

    // Validate category exists if categoryId is provided
    let validCategoryId = categoryId;
    if (categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      
      if (categoryExists.length === 0) {
        // If category doesn't exist, set categoryId to null
        validCategoryId = null;
      }
    }

    // Insert the product using a transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // Insert the product
      await tx.insert(products).values({
        id: productId,
        name,
        description,
        sku: finalSku,  // Use the potentially auto-generated SKU
        barcode,
        image,
        imageUrl,
        categoryId: validCategoryId,
        unit,
        profitMargin
      });
      
      // Insert the product price entry
      if (purchasePrice !== '0' || sellingPrice !== '0') {
        await tx.insert(productPrices).values({
          id: `pp_${nanoid(10)}`,
          productId,
          branchId: branchId, // Use the valid branch ID or null
          purchasePrice: purchasePrice.toString(),
          sellingPrice: sellingPrice.toString(),
          effectiveDate: new Date(),
          createdAt: new Date()
        });
      }
      
      // Insert the inventory entry - if no branch exists, skip inventory creation
      if (branchId) {
        await tx.insert(inventory).values({
          id: `inv_${nanoid(10)}`,
          productId,
          branchId: branchId,
          quantity: stock,
          minStock,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
    
    // Return the created product with related data
    const [createdProduct] = await db
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
        minStock: inventory.minStock
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, productId))
      .limit(1);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Product created successfully',
        data: createdProduct
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating product:', error);
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