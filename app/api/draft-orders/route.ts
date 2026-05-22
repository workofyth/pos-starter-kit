import { NextRequest } from 'next/server';
import { db } from '@/db';
import { draftOrders, user, branches, members } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// This API will handle draft orders
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
    
    const branchId = searchParams.get('branchId');
    const cashierId = searchParams.get('cashierId');
    
    // Build the query with joins
    let query = db
      .select({
        id: draftOrders.id,
        userId: draftOrders.userId,
        branchId: draftOrders.branchId,
        cashierId: draftOrders.cashierId,
        memberId: draftOrders.memberId,
        cartData: draftOrders.cartData,
        paymentMethod: draftOrders.paymentMethod,
        discountRate: draftOrders.discountRate,
        notes: draftOrders.notes,
        total: draftOrders.total,
        createdAt: draftOrders.createdAt,
        updatedAt: draftOrders.updatedAt,
        cashierName: user.name,
        memberName: members.name,
      })
      .from(draftOrders)
      .leftJoin(user, eq(draftOrders.cashierId, user.id))
      .leftJoin(members, eq(draftOrders.memberId, members.id));
    
    // Apply filters
    const whereConditions = [eq(draftOrders.storeId, storeId)];
    
    if (branchId) whereConditions.push(eq(draftOrders.branchId, branchId));
    if (cashierId) whereConditions.push(eq(draftOrders.cashierId, cashierId));
    
    const draftOrdersList = await query
      .where(and(...whereConditions))
      .orderBy(desc(draftOrders.createdAt));
    
    return new Response(
      JSON.stringify({ success: true, data: draftOrdersList }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching draft orders:', error);
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
      branchId,
      cashierId,
      cart,
      memberId,
      notes,
      paymentMethod = 'cash',
      discountRate = '0',
      total
    } = body;
    
    if (!branchId || !cashierId || !cart || total === undefined) {
      return new Response(JSON.stringify({ success: false, message: 'Branch ID, Cashier ID, Cart, and Total are required' }), { status: 400 });
    }
    
    const draftOrderId = `draft_${nanoid(10)}`;
    
    const [newDraftOrder] = await db
      .insert(draftOrders)
      .values({
        id: draftOrderId,
        storeId,
        userId: session.user.id,
        branchId,
        cashierId,
        memberId: memberId || null,
        cartData: cart,
        paymentMethod,
        discountRate,
        notes: notes || '',
        total: total.toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Draft saved successfully', data: newDraftOrder }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving draft order:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const storeId = session.user.storeId;
    const body = await request.json();
    const { id, cart, memberId, notes, paymentMethod, discountRate, total } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'Draft order ID is required' }), { status: 400 });
    }
    
    const [updatedDraftOrder] = await db
      .update(draftOrders)
      .set({
        cartData: cart,
        memberId: memberId || null,
        notes: notes || '',
        paymentMethod: paymentMethod || 'cash',
        discountRate: discountRate || '0',
        total: total?.toString(),
        updatedAt: new Date()
      })
      .where(and(eq(draftOrders.id, id), eq(draftOrders.storeId, storeId)))
      .returning();
    
    if (!updatedDraftOrder) {
      return new Response(JSON.stringify({ success: false, message: 'Draft order not found' }), { status: 404 });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Draft order updated successfully', data: updatedDraftOrder }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating draft order:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.storeId) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), { status: 401 });
    }

    const storeId = session.user.storeId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'Draft ID is required' }), { status: 400 });
    }
    
    const result = await db
      .delete(draftOrders)
      .where(and(eq(draftOrders.id, id), eq(draftOrders.storeId, storeId)))
      .returning();
    
    if (result.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Draft order not found' }), { status: 404 });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Draft order deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting draft order:', error);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), { status: 500 });
  }
}