// Test to verify that notifications are sent correctly without duplicates
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import { notifications, userBranches, branches } from '@/db/schema/pos';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendNotificationsToBranchRoles } from '@/lib/notification-helpers';

describe('Notification System', () => {
  beforeEach(async () => {
    // Clear notifications table before each test
    await db.delete(notifications);
  });

  afterEach(async () => {
    // Clear notifications table after each test
    await db.delete(notifications);
  });

  it('should send individual notifications to each user without duplicates', async () => {
    // Create a mock branch
    const [mockBranch] = await db
      .insert(branches)
      .values({
        id: `brn_${nanoid(10)}`,
        name: 'Test Branch',
        address: 'Test Address',
        phone: '1234567890',
        email: 'test@example.com',
        type: 'sub',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create mock users for the branch
    const mockUsers = [
      { id: `usr_${nanoid(10)}`, name: 'Admin User' },
      { id: `usr_${nanoid(10)}`, name: 'Staff User' },
      { id: `usr_${nanoid(10)}`, name: 'Manager User' },
    ];

    // Associate users with the branch and roles
    for (const user of mockUsers) {
      await db
        .insert(userBranches)
        .values({
          id: `ub_${nanoid(10)}`,
          userId: user.id,
          branchId: mockBranch.id,
          role: ['admin', 'staff', 'manager'][mockUsers.indexOf(user)],
          isMainAdmin: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // Send notifications to branch roles
    await sendNotificationsToBranchRoles(
      mockBranch.id,
      ['admin', 'staff', 'manager'],
      {
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'test_notification',
        data: {
          test: 'data'
        }
      }
    );

    // Verify that each user received exactly one notification
    for (const user of mockUsers) {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id));

      expect(userNotifications).toHaveLength(1);
      expect(userNotifications[0].title).toBe('Test Notification');
      expect(userNotifications[0].message).toBe('This is a test notification');
      expect(userNotifications[0].type).toBe('test_notification');
    }

    // Also verify there's one branch-level notification
    const branchNotifications = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.branchId, mockBranch.id),
        eq(notifications.userId, null)
      ));

    expect(branchNotifications).toHaveLength(1);
    expect(branchNotifications[0].title).toBe('Test Notification');
    expect(branchNotifications[0].message).toBe('This is a test notification');
    expect(branchNotifications[0].type).toBe('test_notification');
  });

  it('should handle duplicate user roles correctly', async () => {
    // Create a mock branch
    const [mockBranch] = await db
      .insert(branches)
      .values({
        id: `brn_${nanoid(10)}`,
        name: 'Test Branch 2',
        address: 'Test Address 2',
        phone: '1234567891',
        email: 'test2@example.com',
        type: 'sub',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create a mock user
    const mockUser = { id: `usr_${nanoid(10)}`, name: 'Multi-role User' };

    // Associate user with the branch and multiple roles (simulating a potential edge case)
    await db
      .insert(userBranches)
      .values({
        id: `ub_${nanoid(10)}`,
        userId: mockUser.id,
        branchId: mockBranch.id,
        role: 'admin',
        isMainAdmin: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    await db
      .insert(userBranches)
      .values({
        id: `ub_${nanoid(10)}`,
        userId: mockUser.id,
        branchId: mockBranch.id,
        role: 'staff',
        isMainAdmin: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Send notifications to branch roles
    await sendNotificationsToBranchRoles(
      mockBranch.id,
      ['admin', 'staff'],
      {
        title: 'Duplicate Role Test',
        message: 'Testing duplicate roles',
        type: 'duplicate_role_test',
        data: {
          test: 'duplicate_roles'
        }
      }
    );

    // Verify that the user received exactly one notification despite having multiple roles
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, mockUser.id));

    expect(userNotifications).toHaveLength(1);
    expect(userNotifications[0].title).toBe('Duplicate Role Test');
    expect(userNotifications[0].message).toBe('Testing duplicate roles');
    expect(userNotifications[0].type).toBe('duplicate_role_test');
  });
});