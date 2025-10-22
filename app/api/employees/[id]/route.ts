import { NextRequest } from 'next/server';
import { db } from '@/db';
import { user, userBranches } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';

// GET a single employee by ID
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
          message: 'Employee ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const employee = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        userBranchId: userBranches.id,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isActive: userBranches.isActive,
        userBranchCreatedAt: userBranches.createdAt
      })
      .from(user)
      .leftJoin(userBranches, eq(user.id, userBranches.userId))
      .where(eq(user.id, id))
      .limit(1);
    
    if (employee.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Employee not found' 
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
        data: {
          id: employee[0].id,
          name: employee[0].name,
          email: employee[0].email,
          image: employee[0].image,
          createdAt: employee[0].createdAt,
          updatedAt: employee[0].updatedAt,
          branchId: employee[0].branchId,
          role: employee[0].role,
          isActive: employee[0].isActive
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching employee:', error);
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

// PUT - Update an employee by ID
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
          message: 'Employee ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, id));
    
    if (existingUser.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Employee not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      name,
      email,
      image,
      branchId,
      role,
      isActive
    } = body;
    
    // Check for duplicate email if changed
    if (email && email !== existingUser[0].email) {
      const existingUserByEmail = await db
        .select()
        .from(user)
        .where(eq(user.email, email));
      
      if (existingUserByEmail.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'User with this email already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // Update the user
    const [updatedUser] = await db
      .update(user)
      .set({
        name: name !== undefined ? name : existingUser[0].name,
        email: email !== undefined ? email : existingUser[0].email,
        image: image !== undefined ? image : existingUser[0].image,
        updatedAt: new Date()
      })
      .where(eq(user.id, id))
      .returning();
    
    // Update the user branch association if provided
    if (branchId || role || isActive !== undefined) {
      // Find the current user branch record
      const existingUserBranch = await db
        .select()
        .from(userBranches)
        .where(eq(userBranches.userId, id))
        .limit(1);
      
      if (existingUserBranch.length > 0) {
        await db
          .update(userBranches)
          .set({
            branchId: branchId !== undefined ? branchId : existingUserBranch[0].branchId,
            role: role !== undefined ? role : existingUserBranch[0].role,
            isActive: isActive !== undefined ? isActive : existingUserBranch[0].isActive,
            createdAt: existingUserBranch[0].createdAt // Preserve original creation date
          })
          .where(eq(userBranches.id, existingUserBranch[0].id));
      }
    }
    
    // Get updated employee information
    const [completeUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        branchId: userBranches.branchId,
        role: userBranches.role,
        isActive: userBranches.isActive
      })
      .from(user)
      .leftJoin(userBranches, eq(user.id, userBranches.userId))
      .where(eq(user.id, id))
      .limit(1);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Employee updated successfully',
        data: completeUser
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating employee:', error);
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

// DELETE an employee by ID
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
          message: 'Employee ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if employee exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, id));
    
    if (existingUser.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Employee not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the user branch association
    await db
      .delete(userBranches)
      .where(eq(userBranches.userId, id));
    
    // Delete the user (this will cascade delete related records based on auth schema)
    await db
      .delete(user)
      .where(eq(user.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Employee deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting employee:', error);
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