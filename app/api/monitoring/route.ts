import { NextRequest } from 'next/server';
import { db } from '@/db';
import {
  branches,
  userBranches,
  categories,
  brands,
  products,
  members,
  suppliers,
  inventory,
  inventoryTransactions,
  transactions,
  purchaseOrders,
  draftOrders,
  notifications,
} from '@/db/schema/pos';
import { user, session } from '@/db/schema/auth';
import { eq, and, gt, gte, inArray, sql, desc } from 'drizzle-orm';
import { requireMainAdmin, guardResponse } from '@/lib/admin-guard';

// GET - Store-wide monitoring snapshot: data overview, active users, recent activity.
// Main-admin only: this aggregates across every branch in the store.
export async function GET(request: NextRequest) {
  try {
    const guard = await requireMainAdmin();
    if (!guard.ok) return guardResponse(guard);
    if (!guard.storeId) {
      return new Response(
        JSON.stringify({ success: false, message: 'No store associated with your account' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const storeId = guard.storeId;

    const { searchParams } = new URL(request.url);
    const activityLimit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const storeBranches = db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.storeId, storeId));

    const countOf = async (table: any, where: any) => {
      const [row] = await db.select({ n: sql<number>`count(*)` }).from(table).where(where);
      return Number(row?.n || 0);
    };

    const [
      branchesCount,
      productsCount,
      categoriesCount,
      brandsCount,
      suppliersCount,
      membersCount,
      transactionsCount,
      transactionsTodayCount,
      purchaseOrdersCount,
      draftOrdersCount,
      unreadNotificationsCount,
      inventoryItemsCount,
      lowStockCount,
      staffCount,
      activeSessions,
      recentTransactions,
      recentInventoryMoves,
      recentPurchaseOrders,
      recentStaffChanges,
    ] = await Promise.all([
      countOf(branches, eq(branches.storeId, storeId)),
      countOf(products, eq(products.storeId, storeId)),
      countOf(categories, eq(categories.storeId, storeId)),
      countOf(brands, eq(brands.storeId, storeId)),
      countOf(suppliers, eq(suppliers.storeId, storeId)),
      countOf(members, eq(members.storeId, storeId)),
      countOf(transactions, inArray(transactions.branchId, storeBranches)),
      countOf(transactions, and(inArray(transactions.branchId, storeBranches), gte(transactions.createdAt, startOfToday))),
      countOf(purchaseOrders, inArray(purchaseOrders.branchId, storeBranches)),
      countOf(draftOrders, inArray(draftOrders.branchId, storeBranches)),
      countOf(notifications, and(inArray(notifications.branchId, storeBranches), eq(notifications.isRead, false))),
      countOf(inventory, inArray(inventory.branchId, storeBranches)),
      countOf(inventory, and(inArray(inventory.branchId, storeBranches), sql`${inventory.quantity} <= ${inventory.minStock}`)),
      countOf(userBranches, and(inArray(userBranches.branchId, storeBranches), eq(userBranches.isActive, true))),

      // Active (non-expired) sessions for users belonging to this store
      db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
          sessionId: session.id,
          lastSeen: session.updatedAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          role: userBranches.role,
          isMainAdmin: userBranches.isMainAdmin,
          branchName: branches.name,
        })
        .from(session)
        .innerJoin(user, eq(session.userId, user.id))
        .innerJoin(userBranches, eq(userBranches.userId, user.id))
        .innerJoin(branches, eq(userBranches.branchId, branches.id))
        .where(and(
          gt(session.expiresAt, now),
          eq(branches.storeId, storeId),
          eq(userBranches.isActive, true)
        ))
        .orderBy(desc(session.updatedAt)),

      db
        .select({
          id: transactions.id,
          transactionNumber: transactions.transactionNumber,
          total: transactions.total,
          status: transactions.status,
          createdAt: transactions.createdAt,
          branchName: branches.name,
          actorName: user.name,
        })
        .from(transactions)
        .innerJoin(branches, eq(transactions.branchId, branches.id))
        .leftJoin(user, eq(transactions.cashierId, user.id))
        .where(inArray(transactions.branchId, storeBranches))
        .orderBy(desc(transactions.createdAt))
        .limit(activityLimit),

      db
        .select({
          id: inventoryTransactions.id,
          type: inventoryTransactions.type,
          quantity: inventoryTransactions.quantity,
          status: inventoryTransactions.status,
          createdAt: inventoryTransactions.createdAt,
          productName: products.name,
          branchName: branches.name,
          actorName: user.name,
        })
        .from(inventoryTransactions)
        .innerJoin(branches, eq(inventoryTransactions.branchId, branches.id))
        .innerJoin(products, eq(inventoryTransactions.productId, products.id))
        .leftJoin(user, eq(inventoryTransactions.createdBy, user.id))
        .where(inArray(inventoryTransactions.branchId, storeBranches))
        .orderBy(desc(inventoryTransactions.createdAt))
        .limit(activityLimit),

      db
        .select({
          id: purchaseOrders.id,
          orderNumber: purchaseOrders.orderNumber,
          total: purchaseOrders.total,
          status: purchaseOrders.status,
          createdAt: purchaseOrders.createdAt,
          branchName: branches.name,
          supplierName: suppliers.name,
        })
        .from(purchaseOrders)
        .innerJoin(branches, eq(purchaseOrders.branchId, branches.id))
        .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(inArray(purchaseOrders.branchId, storeBranches))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(activityLimit),

      db
        .select({
          id: userBranches.id,
          role: userBranches.role,
          isMainAdmin: userBranches.isMainAdmin,
          createdAt: userBranches.createdAt,
          userName: user.name,
          branchName: branches.name,
        })
        .from(userBranches)
        .innerJoin(branches, eq(userBranches.branchId, branches.id))
        .innerJoin(user, eq(userBranches.userId, user.id))
        .where(inArray(userBranches.branchId, storeBranches))
        .orderBy(desc(userBranches.createdAt))
        .limit(activityLimit),
    ]);

    // Dedupe active sessions to one row per user (most recent activity wins)
    const activeUsersMap = new Map<string, any>();
    for (const row of activeSessions) {
      const existing = activeUsersMap.get(row.userId);
      if (!existing || new Date(row.lastSeen) > new Date(existing.lastSeen)) {
        activeUsersMap.set(row.userId, { ...row, sessionCount: (existing?.sessionCount || 0) + 1 });
      } else {
        existing.sessionCount = (existing.sessionCount || 1) + 1;
      }
    }
    const activeUsers = Array.from(activeUsersMap.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    const activity = [
      ...recentTransactions.map(t => ({
        id: `txn-${t.id}`,
        type: 'transaction' as const,
        title: `Transaction ${t.transactionNumber}`,
        actorName: t.actorName || 'Unknown',
        branchName: t.branchName,
        amount: Number(t.total),
        status: t.status,
        createdAt: t.createdAt,
      })),
      ...recentInventoryMoves.map(i => ({
        id: `inv-${i.id}`,
        type: 'inventory' as const,
        title: `${i.type.toUpperCase()} · ${i.productName}`,
        actorName: i.actorName || 'System',
        branchName: i.branchName,
        amount: i.quantity,
        status: i.status,
        createdAt: i.createdAt,
      })),
      ...recentPurchaseOrders.map(p => ({
        id: `po-${p.id}`,
        type: 'purchase_order' as const,
        title: `PO ${p.orderNumber} · ${p.supplierName}`,
        actorName: p.supplierName,
        branchName: p.branchName,
        amount: Number(p.total),
        status: p.status,
        createdAt: p.createdAt,
      })),
      ...recentStaffChanges.map(s => ({
        id: `staff-${s.id}`,
        type: 'staff' as const,
        title: `${s.userName} ${s.isMainAdmin ? 'set as main admin' : `assigned as ${s.role}`}`,
        actorName: s.userName,
        branchName: s.branchName,
        amount: null,
        status: s.role,
        createdAt: s.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, activityLimit);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          overview: {
            branches: branchesCount,
            products: productsCount,
            categories: categoriesCount,
            brands: brandsCount,
            suppliers: suppliersCount,
            members: membersCount,
            transactions: transactionsCount,
            transactionsToday: transactionsTodayCount,
            purchaseOrders: purchaseOrdersCount,
            draftOrders: draftOrdersCount,
            unreadNotifications: unreadNotificationsCount,
            inventoryItems: inventoryItemsCount,
            lowStockItems: lowStockCount,
            staff: staffCount,
          },
          activeUsers,
          activity,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error building monitoring snapshot:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
