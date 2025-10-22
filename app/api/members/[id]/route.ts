import { NextRequest } from 'next/server';
import { db } from '@/db';
import { members } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

// GET a single member by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
      .where(eq(members.id, id))
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    
    // Check if member exists
    const existingMember = await db
      .select()
      .from(members)
      .where(eq(members.id, id));
    
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
        .where(eq(members.email, email));
      
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
        .where(eq(members.phone, phone));
      
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
      .where(eq(members.id, id))
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    
    // Check if member exists
    const existingMember = await db
      .select()
      .from(members)
      .where(eq(members.id, id));
    
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
      .where(eq(members.id, id));
    
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