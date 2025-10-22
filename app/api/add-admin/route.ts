// This API route is for adding the specific user as admin - one-time use
// IMPORTANT: Remove this route after use for security reasons
// SECURITY WARNING: This endpoint should be removed after use to prevent unauthorized admin access

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { user, userBranches, branches } from '@/db/schema/pos';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Find the user by email
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, 'yufitaufikhidayat@gmail.com'));
    
    if (users.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User with email yufitaufikhidayat@gmail.com not found in the database' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const userId = users[0].id;
    
    // Get a branch ID to assign the user to (using the first available branch)
    const availableBranches = await db
      .select()
      .from(branches)
      .limit(1);
    
    if (availableBranches.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No branches found in the database' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const branchId = availableBranches[0].id;
    
    // Check if user is already assigned to any branch
    const existingAssignment = await db
      .select()
      .from(userBranches)
      .where(eq(userBranches.userId, userId));
    
    if (existingAssignment.length > 0) {
      // Update existing assignment to admin role
      await db
        .update(userBranches)
        .set({ 
          role: 'admin',
          updatedAt: new Date()
        })
        .where(eq(userBranches.userId, userId));
        
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'User role updated to admin successfully!' 
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create the user-branch assignment with admin role
    const newAssignment = await db
      .insert(userBranches)
      .values({
        id: `ubr_${nanoid(10)}`, // Generate a unique ID
        userId: userId,
        branchId: branchId,
        role: 'admin', // Assign as admin
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User assigned to branch as admin successfully!',
        data: newAssignment[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error adding user to branch:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error adding user to branch',
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}