import { NextRequest } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

// GET a single member by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Member ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const member = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.storeId, guard.storeId)))
      .limit(1);
    
    if (member.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Member not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: member[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching member:', error);
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

// PUT - Update a member by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Member ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if member exists in this store
    const existingMember = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.storeId, guard.storeId)));

    if (existingMember.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Member not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      name,
      phone,
      email,
      address,
      points
    } = body;
    
    // Check for duplicate email if provided and different from current
    if (email && email !== existingMember[0].email) {
      const existingMemberByEmail = await db
        .select()
        .from(members)
        .where(and(eq(members.email, email), eq(members.storeId, guard.storeId)));
      
      if (existingMemberByEmail.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Member with this email already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Check for duplicate phone if provided and different from current
    if (phone && phone !== existingMember[0].phone) {
      const existingMemberByPhone = await db
        .select()
        .from(members)
        .where(and(eq(members.phone, phone), eq(members.storeId, guard.storeId)));
      
      if (existingMemberByPhone.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Member with this phone number already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Update the member
    const [updatedMember] = await db
      .update(members)
      .set({
        name: name !== undefined ? name : existingMember[0].name,
        phone: phone !== undefined ? phone : existingMember[0].phone,
        email: email !== undefined ? email : existingMember[0].email,
        address: address !== undefined ? address : existingMember[0].address,
        points: points !== undefined ? points : existingMember[0].points,
        updatedAt: new Date()
      })
      .where(and(eq(members.id, id), eq(members.storeId, guard.storeId)))
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member updated successfully',
        data: updatedMember
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating member:', error);
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

// DELETE a member by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Member ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if member exists in this store
    const existingMember = await db
      .select()
      .from(members)
      .where(and(eq(members.id, id), eq(members.storeId, guard.storeId)));

    if (existingMember.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Member not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete the member
    await db
      .delete(members)
      .where(and(eq(members.id, id), eq(members.storeId, guard.storeId)));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting member:', error);
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