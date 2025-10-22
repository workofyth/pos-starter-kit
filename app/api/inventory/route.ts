import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, categories } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const search = searchParams.get('search') || '';
    const sku = searchParams.get('sku') || '';
    const category = searchParams.get('category') || '';
    const branchId = searchParams.get('branchId') || '';
    const lowStock = searchParams.get('lowStock') || '';
    const outOfStock = searchParams.get('outOfStock') || '';
    const sortBy = searchParams.get('sortBy') || 'productName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Build query with joins
    let query = db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        lastUpdated: inventory.lastUpdated,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productSku: products.sku,
        productBarcode: products.barcode,
        productDescription: products.description,
        productImage: products.image,
        productImageUrl: products.imageUrl,
        productCategoryId: products.categoryId,
        productCategoryName: categories.name,
        productCategoryCode: categories.code,
        branchName: branches.name,
        branchAddress: branches.address
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(limit)
      .offset(offset);
    
    // Apply filters
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        ilike(products.name, `%${search}%`)
      );
    }
    
    if (sku) {
      whereConditions.push(
        ilike(products.sku, `%${sku}%`)
      );
    }
    
    if (category) {
      whereConditions.push(
        ilike(categories.name, `%${category}%`)
      );
    }
    
    if (branchId) {
      whereConditions.push(eq(inventory.branchId, branchId));
    }
    
    if (lowStock === 'true') {
      whereConditions.push(
        sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`
      );
    }
    
    if (outOfStock === 'true') {
      whereConditions.push(eq(inventory.quantity, 0));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply sorting
    if (sortBy === 'productName') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(products.name)) as typeof query
        : query.orderBy(desc(products.name)) as typeof query;
    } else if (sortBy === 'quantity') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventory.quantity)) as typeof query
        : query.orderBy(desc(inventory.quantity)) as typeof query;
    } else if (sortBy === 'lastUpdated') {
      query = sortOrder === 'asc' 
        ? query.orderBy(asc(inventory.lastUpdated)) as typeof query
        : query.orderBy(desc(inventory.lastUpdated)) as typeof query;
    } else {
      query = query.orderBy(desc(inventory.lastUpdated)) as typeof query;
    }
    
    const inventoryList = await query;
    
    // Get total count for pagination
    let countQuery: any = db
      .select({ count: count() })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));
    
    let countWhereConditions = [];
    
    if (search) {
      countWhereConditions.push(
        ilike(products.name, `%${search}%`)
      );
    }
    
    if (sku) {
      countWhereConditions.push(
        ilike(products.sku, `%${sku}%`)
      );
    }
    
    if (category) {
      countWhereConditions.push(
        ilike(categories.name, `%${category}%`)
      );
    }
    
    if (branchId) {
      countWhereConditions.push(eq(inventory.branchId, branchId));
    }
    
    if (lowStock === 'true') {
      countWhereConditions.push(
        sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`
      );
    }
    
    if (outOfStock === 'true') {
      countWhereConditions.push(eq(inventory.quantity, 0));
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
        data: inventoryList,
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
    console.error('Error fetching inventory:', error);
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

// POST - Update stock quantity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      productId,
      branchId,
      quantity,
      notes = '',
      type = 'adjustment' // in, out, adjustment, receive, delivery
    } = body;
    
    // Validate required fields
    if (!productId || !branchId || quantity === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product ID, Branch ID, and Quantity are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validate type is one of the allowed values
    const validTypes = ['in', 'out', 'adjustment', 'receive', 'delivery'];
    if (type && !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid type. Must be one of: in, out, adjustment, receive, delivery' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Validate branchId is not empty
    if (!branchId || branchId.trim() === '') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch ID is required and cannot be empty' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if inventory record exists
    const existingInventory = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.branchId, branchId)
        )
      )
      .limit(1);
    
    let inventoryRecord;
    
    if (existingInventory.length > 0) {
      // Update existing inventory
      const newQuantity = type === 'out' 
        ? existingInventory[0].quantity - quantity 
        : type === 'in' 
          ? existingInventory[0].quantity + quantity 
          : quantity; // adjustment sets quantity directly
      
      const [updatedInventory] = await db
        .update(inventory)
        .set({
          quantity: newQuantity,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.branchId, branchId)
          )
        )
        .returning();
      
      inventoryRecord = updatedInventory;
    } else {
      // Create new inventory record
      const initialQuantity = type === 'out' ? -quantity : type === 'in' ? quantity : quantity;
      
      const [newInventory] = await db
        .insert(inventory)
        .values({
          id: `inv_${nanoid(10)}`,
          productId,
          branchId,
          quantity: initialQuantity,
          minStock: 5, // Default minimum stock
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      inventoryRecord = newInventory;
    }
    
    // Create inventory transaction record
    await db.insert(inventoryTransactions).values({
      id: `itx_${nanoid(10)}`,
      productId,
      branchId,
      type: type === 'in' ? 'in' : 
            type === 'out' ? 'out' : 
            type === 'adjustment' ? 'adjustment' :
            type === 'receive' ? 'receive' :
            type === 'delivery' ? 'delivery' : 'adjustment',
      quantity,
      notes: notes || '',
      referenceId: null, // No reference ID for manual adjustments
      createdAt: new Date(),
      createdBy: null // Would be set to actual user ID in production
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inventory updated successfully',
        data: inventoryRecord
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating inventory:', error);
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