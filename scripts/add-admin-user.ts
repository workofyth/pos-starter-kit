import { db } from '@/db';
import { user, userBranches, branches } from '@/db/schema/pos';
import { nanoid } from 'nanoid';
import { eq, sql } from 'drizzle-orm';

async function addUserToBranch() {
  try {
    // Find the user by email
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, 'yufitaufikhidayat@gmail.com'));
    
    if (users.length === 0) {
      console.error('User with email yufitaufikhidayat@gmail.com not found in the database');
      return;
    }
    
    const userId = users[0].id;
    console.log(`Found user with ID: ${userId}`);
    
    // Get a branch ID to assign the user to (using the first available branch)
    const availableBranches = await db
      .select()
      .from(branches)
      .limit(1);
    
    if (availableBranches.length === 0) {
      console.error('No branches found in the database');
      return;
    }
    
    const branchId = availableBranches[0].id;
    console.log(`Assigning user to branch: ${branchId} (${availableBranches[0].name})`);
    
    // Check if user is already assigned to any branch
    const existingAssignment = await db
      .select()
      .from(userBranches)
      .where(eq(userBranches.userId, userId));
    
    if (existingAssignment.length > 0) {
      console.log('User is already assigned to a branch. Updating role to admin...');
      
      // Update existing assignment to admin role
      await db
        .update(userBranches)
        .set({ 
          role: 'admin',
          updatedAt: new Date()
        })
        .where(eq(userBranches.userId, userId));
        
      console.log('User role updated to admin successfully!');
      return;
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
    
    console.log('User assigned to branch as admin successfully!');
    console.log('Assignment details:', newAssignment[0]);
    
  } catch (error) {
    console.error('Error adding user to branch:', error);
  }
}

// Run the function
addUserToBranch();