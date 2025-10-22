import { NextRequest } from 'next/server';
import { db } from '@/db';
import { draftOrders, user, branches, members } from '@/db/schema/pos';
import { eq, and, ilike, desc, asc, count, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// This API will handle draft orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId');
    const branchId = searchParams.get('branchId');
    const cashierId = searchParams.get('cashierId');
    
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
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
    let whereConditions = [];
    
    // Only filter by userId if provided (to allow users to see their own drafts)
    if (userId) {
      // Users can only see their own draft orders
      whereConditions.push(eq(draftOrders.userId, userId));
    }
    
    if (branchId) {
      whereConditions.push(eq(draftOrders.branchId, branchId));
    }
    
    // cashierId filter (for specific cashier's drafts) - this is optional and mainly for admin purposes
    if (cashierId && !userId) {
      // Only use cashierId filter if userId is not provided (for admin/manager purposes)
      whereConditions.push(eq(draftOrders.cashierId, cashierId));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as typeof query;
    }
    
    // Apply ordering after filters
    query = query.orderBy(desc(draftOrders.createdAt)) as typeof query;
    
    const draftOrdersList = await query;
    
    return new Response(
      JSON.stringify({
        success: true,
        data: draftOrdersList
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching draft orders:', error);
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
      userId,
      branchId,
      cashierId,
      cart,
      memberId,
      notes,
      paymentMethod = 'cash',
      discountRate = '0',
      total
    } = body;
    
    // Validate required fields
    if (!userId || !branchId || !cashierId || !cart || total === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User ID, Branch ID, Cashier ID, Cart, and Total are required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Verify that the requesting user is authorized to create this draft order
    // In a real application, you'd verify the session token here
    // For now, we'll just ensure userId matches the cashierId (as they should be the same person)
    if (userId !== cashierId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Unauthorized: User ID must match Cashier ID' 
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate unique ID
    const draftOrderId = `draft_${nanoid(10)}`;
    
    // Insert the draft order
    const [newDraftOrder] = await db
      .insert(draftOrders)
      .values({
        id: draftOrderId,
        userId,
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
      JSON.stringify({ 
        success: true, 
        message: 'Draft saved successfully',
        data: newDraftOrder
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error saving draft order:', error);
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, cart, memberId, notes, paymentMethod, discountRate, total } = body;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Draft order ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Update the draft order
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
      .where(eq(draftOrders.id, id))
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Draft order updated successfully',
        data: updatedDraftOrder
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating draft order:', error);
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Draft ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the draft order
    await db
      .delete(draftOrders)
      .where(eq(draftOrders.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Draft order deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting draft order:', error);
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