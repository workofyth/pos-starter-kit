import { NextRequest } from 'next/server';
import { db } from '@/db';
import { inventory, products, branches, inventoryTransactions, categories, userBranches } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql, inArray } from 'drizzle-orm';
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
    
    // Search and filter parameters
    const search = searchParams.get('search') || '';
    const sku = searchParams.get('sku') || '';
    const category = searchParams.get('category') || '';
    const requestedBranchId = searchParams.get('branchId') || '';
    const lowStock = searchParams.get('lowStock') || '';
    const outOfStock = searchParams.get('outOfStock') || '';
    const sortBy = searchParams.get('sortBy') || 'productName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Build filter conditions
    const whereConditions = [eq(inventory.storeId, session.user.storeId)];
    
    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`));
    }
    
    if (sku) {
      whereConditions.push(ilike(products.sku, `%${sku}%`));
    }
    
    if (category) {
      whereConditions.push(ilike(categories.name, `%${category}%`));
    }
    
    if (requestedBranchId) {
      whereConditions.push(eq(inventory.branchId, requestedBranchId));
    }
    
    if (lowStock === 'true') {
      whereConditions.push(sql`${inventory.quantity} <= ${inventory.minStock} AND ${inventory.quantity} > 0`);
    }
    
    if (outOfStock === 'true') {
      whereConditions.push(eq(inventory.quantity, 0));
    }
    
    // Determine sorting
    let orderByColumn;
    if (sortBy === 'productName') {
      orderByColumn = sortOrder === 'asc' ? asc(products.name) : desc(products.name);
    } else if (sortBy === 'quantity') {
      orderByColumn = sortOrder === 'asc' ? asc(inventory.quantity) : desc(inventory.quantity);
    } else if (sortBy === 'lastUpdated') {
      orderByColumn = sortOrder === 'asc' ? asc(inventory.lastUpdated) : desc(inventory.lastUpdated);
    } else {
      orderByColumn = desc(inventory.lastUpdated);
    }
    
    const inventoryList = await db
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
        productBrand: products.brand,
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
      .where(and(...whereConditions))
      .orderBy(orderByColumn)
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...whereConditions));
    
    const totalCount = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: inventoryList,
        pagination: {
          page, limit, totalCount, totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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
    const { productId, branchId, quantity, notes = '', type = 'adjustment' } = body;
    
    if (!productId || !branchId || quantity === undefined) {
      return new Response(JSON.stringify({ success: false, message: 'Product ID, Branch ID, and Quantity are required' }), { status: 400 });
    }
    
    // Ensure the branch belongs to the store
    const branchExists = await db.select({ id: branches.id }).from(branches)
      .where(and(eq(branches.id, branchId), eq(branches.storeId, session.user.storeId)))
      .limit(1);
    
    if (branchExists.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Branch does not exist in your store' }), { status: 403 });
    }

    // Ensure product belongs to the store
    const productExists = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, session.user.storeId)))
      .limit(1);

    if (productExists.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Product does not exist in your store' }), { status: 403 });
    }
    
    // Check if inventory record exists
    const existingInventory = await db.select().from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.branchId, branchId), eq(inventory.storeId, session.user.storeId)))
      .limit(1);
    
    let inventoryRecord;
    
    if (existingInventory.length > 0) {
      const newQuantity = type === 'out' ? existingInventory[0].quantity - quantity : type === 'in' ? existingInventory[0].quantity + quantity : quantity;
      
      const [updatedInventory] = await db.update(inventory)
        .set({ quantity: newQuantity, lastUpdated: new Date(), updatedAt: new Date() })
        .where(and(eq(inventory.productId, productId), eq(inventory.branchId, branchId), eq(inventory.storeId, session.user.storeId)))
        .returning();
      
      inventoryRecord = updatedInventory;
    } else {
      const initialQuantity = type === 'out' ? -quantity : type === 'in' ? quantity : quantity;
      
      const [newInventory] = await db.insert(inventory).values({
          id: `inv_${nanoid(10)}`,
          storeId: session.user.storeId,
          productId,
          branchId,
          quantity: initialQuantity,
          minStock: 5,
          lastUpdated: new Date()
        }).returning();
      
      inventoryRecord = newInventory;
    }
    
    await db.insert(inventoryTransactions).values({
      id: `itx_${nanoid(10)}`,
      storeId: session.user.storeId,
      productId,
      branchId,
      type: type as any,
      quantity,
      stockBefore: existingInventory.length > 0 ? existingInventory[0].quantity : 0,
      stockAfter: inventoryRecord.quantity,
      notes: notes || '',
      createdAt: new Date(),
      createdBy: session.user.id
    });
    
    return new Response(
      JSON.stringify({ success: true, message: 'Inventory updated successfully', data: inventoryRecord }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating inventory:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}