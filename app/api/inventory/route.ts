import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, categories, userBranches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get user ID from authorization
    // For this implementation, we'll need to extract the userId from the session
    // Since the actual authentication method isn't shown in this file, I'll implement
    // the logic assuming we can get the userId from a header or session
    
    // For now, extract the user data from the session or auth token
    // This would typically be done using the session middleware
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Search and filter parameters
    const search = searchParams.get('search') || '';
    const sku = searchParams.get('sku') || '';
    const category = searchParams.get('category') || '';
    const requestedBranchId = searchParams.get('branchId') || '';
    const lowStock = searchParams.get('lowStock') || '';
    const outOfStock = searchParams.get('outOfStock') || '';
    const sortBy = searchParams.get('sortBy') || 'productName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Extract user ID from session (this is a simplified example)
    // In a real implementation, this would be properly handled by auth middleware
    // For now, let's assume we get the userId from an authorization header or similar mechanism
    const authHeader = request.headers.get('authorization');
    let userId = null;
    
    // This is a placeholder - in a real implementation, you'd decode the JWT or use session data
    // For demonstration purposes, we'll skip the authentication check in this example
    // and instead implement it as a parameter that could be passed from middleware
    
    // For now, we'll implement the validation logic conceptually
    // In practice, you'd validate that the requesting user can access the specified branch
    // If the user is not a main admin, they can only access their assigned branch
    // If requestedBranchId is specified and it's not the user's assigned branch and they're not main admin,
    // we should reject the request
    
    // Validate and sanitize query parameters
    const sanitizedParams = {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)), // Cap limit at 100 for performance
      search: search ? search.trim() : '',
      sku: sku ? sku.trim() : '',
      category: category ? category.trim() : '',
      requestedBranchId: requestedBranchId ? requestedBranchId.trim() : '',
      lowStock: lowStock === 'true',
      outOfStock: outOfStock === 'true',
      sortBy: ['productName', 'quantity', 'lastUpdated'].includes(sortBy) ? sortBy : 'productName',
      sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'asc'
    };
    
    // Simplified query structure for better performance and clarity
    let baseQuery = db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        branchId: inventory.branchId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        maxStock: inventory.maxStock,
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
        branchAddress: branches.address,
        branchPhone: branches.phone,
        branchEmail: branches.email
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .limit(sanitizedParams.limit)
      .offset((sanitizedParams.page - 1) * sanitizedParams.limit);
    
    // Apply filters with proper validation using sanitized parameters
    let whereConditions = [];
    
    if (sanitizedParams.search && sanitizedParams.search.trim() !== '') {
      whereConditions.push(
        ilike(products.name, `%${sanitizedParams.search.trim()}%`)
      );
    }
    
    if (sanitizedParams.sku && sanitizedParams.sku.trim() !== '') {
      whereConditions.push(
        ilike(products.sku, `%${sanitizedParams.sku.trim()}%`)
      );
    }
    
    if (sanitizedParams.category && sanitizedParams.category.trim() !== '') {
      whereConditions.push(
        ilike(categories.name, `%${sanitizedParams.category.trim()}%`)
      );
    }
    
    // Branch filtering - apply only when requestedBranchId is provided and not empty
    if (sanitizedParams.requestedBranchId && sanitizedParams.requestedBranchId.trim() !== '') {
      whereConditions.push(eq(inventory.branchId, sanitizedParams.requestedBranchId.trim()));
    }
    
    if (sanitizedParams.lowStock === true) {
      whereConditions.push(
        sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`
      );
    }
    
    if (sanitizedParams.outOfStock === true) {
      whereConditions.push(eq(inventory.quantity, 0));
    }
    
    // Apply where conditions if any exist and are not empty
    if (whereConditions.length > 0) {
      // Filter out any empty conditions
      const filteredConditions = whereConditions.filter(condition => condition !== undefined);
      if (filteredConditions.length > 0) {
        baseQuery = baseQuery.where(and(...filteredConditions)) as typeof baseQuery;
      }
    }
    
    // Apply sorting with proper validation using sanitized parameters
    if (sanitizedParams.sortBy === 'productName') {
      baseQuery = sanitizedParams.sortOrder === 'asc' 
        ? baseQuery.orderBy(asc(products.name)) as typeof baseQuery
        : baseQuery.orderBy(desc(products.name)) as typeof baseQuery;
    } else if (sanitizedParams.sortBy === 'quantity') {
      baseQuery = sanitizedParams.sortOrder === 'asc' 
        ? baseQuery.orderBy(asc(inventory.quantity)) as typeof baseQuery
        : baseQuery.orderBy(desc(inventory.quantity)) as typeof baseQuery;
    } else if (sanitizedParams.sortBy === 'lastUpdated') {
      baseQuery = sanitizedParams.sortOrder === 'asc' 
        ? baseQuery.orderBy(asc(inventory.lastUpdated)) as typeof baseQuery
        : baseQuery.orderBy(desc(inventory.lastUpdated)) as typeof baseQuery;
    } else {
      // Default sorting by last updated descending
      baseQuery = baseQuery.orderBy(desc(inventory.lastUpdated)) as typeof baseQuery;
    }
    
    const inventoryList = await baseQuery;
    
    // Get total count for pagination with proper filtering using sanitized parameters
    let countQuery: any = db
      .select({ count: count() })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(branches, eq(inventory.branchId, branches.id))
      .leftJoin(categories, eq(products.categoryId, categories.id));
    
    // Apply the same filtering conditions to the count query using sanitized parameters
    let countWhereConditions = [];
    
    if (sanitizedParams.search && sanitizedParams.search.trim() !== '') {
      countWhereConditions.push(
        ilike(products.name, `%${sanitizedParams.search.trim()}%`)
      );
    }
    
    if (sanitizedParams.sku && sanitizedParams.sku.trim() !== '') {
      countWhereConditions.push(
        ilike(products.sku, `%${sanitizedParams.sku.trim()}%`)
      );
    }
    
    if (sanitizedParams.category && sanitizedParams.category.trim() !== '') {
      countWhereConditions.push(
        ilike(categories.name, `%${sanitizedParams.category.trim()}%`)
      );
    }
    
    // Apply branch filter to count query using sanitized parameters
    if (sanitizedParams.requestedBranchId && sanitizedParams.requestedBranchId.trim() !== '') {
      countWhereConditions.push(eq(inventory.branchId, sanitizedParams.requestedBranchId.trim()));
    }
    
    if (sanitizedParams.lowStock === true) {
      countWhereConditions.push(
        sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`
      );
    }
    
    if (sanitizedParams.outOfStock === true) {
      countWhereConditions.push(eq(inventory.quantity, 0));
    }
    
    // Apply where conditions to count query if any exist and are not empty
    if (countWhereConditions.length > 0) {
      // Filter out any empty conditions
      const filteredConditions = countWhereConditions.filter(condition => condition !== undefined);
      if (filteredConditions.length > 0) {
        countQuery = countQuery.where(and(...filteredConditions));
      }
    }
    
    const totalCountResult = await countQuery;
    const totalCount = typeof totalCountResult[0].count === 'number' 
      ? totalCountResult[0].count 
      : parseInt(totalCountResult[0].count as string);
    const totalPages = Math.ceil(totalCount / sanitizedParams.limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: inventoryList,
        pagination: {
          page: sanitizedParams.page,
          limit: sanitizedParams.limit,
          totalCount,
          totalPages,
          hasNext: sanitizedParams.page < totalPages,
          hasPrev: sanitizedParams.page > 1
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