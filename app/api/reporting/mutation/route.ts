import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  inventoryTransactions, 
  products,
  branches,
  transactions,
  members,
  user,
  purchaseOrders,
  suppliers
} from '@/db/schema/pos';
import { eq, and, gte, lte, desc, inArray, or } from 'drizzle-orm';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const filter = searchParams.get('filter') || 'daily';
    
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    switch (filter) {
      case 'weekly':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'yearly':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'daily':
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
    }

    const conditions = [
      gte(inventoryTransactions.createdAt, startDate),
      lte(inventoryTransactions.createdAt, endDate),
      or(
        eq(inventoryTransactions.status, 'completed'),
        eq(inventoryTransactions.status, 'approved')
      )
    ];

    if (branchId) {
      conditions.push(eq(inventoryTransactions.branchId, branchId));
    }

    const results = await db
      .select({
        id: inventoryTransactions.id,
        productName: products.name,
        quantity: inventoryTransactions.quantity,
        type: inventoryTransactions.type,
        referenceId: inventoryTransactions.referenceId,
        transactionNumber: inventoryTransactions.transactionNumber,
        createdAt: inventoryTransactions.createdAt,
        stockBefore: inventoryTransactions.stockBefore,
        stockAfter: inventoryTransactions.stockAfter,
        branchName: branches.name,
        userName: user.name,
      })
      .from(inventoryTransactions)
      .innerJoin(products, eq(inventoryTransactions.productId, products.id))
      .innerJoin(branches, eq(inventoryTransactions.branchId, branches.id))
      .leftJoin(user, eq(inventoryTransactions.createdBy, user.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryTransactions.createdAt));

    if (results.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: { mutationData: [], period: { start: startDate, end: endDate, filter } }
      }), { status: 200 });
    }

    // For POS transactions, fetch member names
    const posTransactionsRefs = results
      .filter(r => r.type === 'pos' && r.referenceId)
      .map(r => r.referenceId as string);

    // For Mutations (Split/Receive), fetch partner branch names
    const partnerBranchIds = results
      .filter(r => (r.type === 'split' || r.type === 'receive') && r.referenceId && r.referenceId.startsWith('brn_'))
      .map(r => r.referenceId as string);

    // For Purchase Orders, fetch supplier names
    const poOrderNumbers = results
      .filter(r => r.type === 'in' && r.referenceId && r.referenceId.startsWith('PO-'))
      .map(r => r.referenceId as string);

    const uniqueRefs = Array.from(new Set(posTransactionsRefs));
    const uniqueBranchIds = Array.from(new Set(partnerBranchIds));

    let memberMap: Record<string, string> = {};
    let branchMap: Record<string, string> = {};
    let poSupplierMap: Record<string, string> = {};
    
    if (uniqueRefs.length > 0) {
      const posTransactions = await db
        .select({
          transactionNumber: transactions.transactionNumber,
          memberName: members.name
        })
        .from(transactions)
        .leftJoin(members, eq(transactions.memberId, members.id))
        .where(inArray(transactions.transactionNumber, uniqueRefs));
      
      posTransactions.forEach(t => {
        memberMap[t.transactionNumber] = t.memberName || 'Retail Customer';
      });
    }

    if (uniqueBranchIds.length > 0) {
      const partnerBranches = await db
        .select({
          id: branches.id,
          name: branches.name
        })
        .from(branches)
        .where(inArray(branches.id, uniqueBranchIds));
      
      partnerBranches.forEach(b => {
        branchMap[b.id] = b.name;
      });
    }

    if (poOrderNumbers.length > 0) {
      const posWithSuppliers = await db
        .select({
          orderNumber: purchaseOrders.orderNumber,
          supplierName: suppliers.name
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(inArray(purchaseOrders.orderNumber, poOrderNumbers));
      
      posWithSuppliers.forEach(p => {
        poSupplierMap[p.orderNumber] = p.supplierName || 'Unknown Supplier';
      });
    }

    const formattedData = results.map(r => {
      let partnerName = '-';
      let displayType = r.type as string;

      if (r.type === 'pos' && r.referenceId) {
        partnerName = memberMap[r.referenceId] || 'Retail Customer';
        displayType = 'Sale';
      } else if (r.type === 'adjustment') {
        partnerName = r.userName || 'System Adjustment';
        displayType = 'Adjustment';
      } else if (r.type === 'in') {
        partnerName = (r.referenceId && poSupplierMap[r.referenceId]) || 'Direct Stock In';
        displayType = 'Purchase';
      } else if (r.type === 'split') {
        partnerName = (r.referenceId && branchMap[r.referenceId]) || r.referenceId || 'Unknown Branch';
        displayType = 'Split (Out)';
      } else if (r.type === 'receive') {
        partnerName = (r.referenceId && branchMap[r.referenceId]) || r.referenceId || 'Unknown Branch';
        displayType = 'Split (In)';
      } else if (r.branchName) {
        partnerName = r.branchName;
      }

      return {
        id: r.id,
        productName: r.productName,
        quantity: r.quantity,
        type: displayType,
        // Transaction Number is the user-facing Ref Number (SPL-xxx, POS-xxx, RECV-xxx)
        referenceId: r.transactionNumber || r.referenceId || '-',
        createdAt: r.createdAt,
        stockBefore: r.stockBefore,
        stockAfter: r.stockAfter,
        partnerName: String(partnerName || '-'),
        branchName: r.branchName
      };
    });
    
    console.log('Sample Formatted Mutation Data:', JSON.stringify(formattedData.slice(0, 3), null, 2));

    return new Response(JSON.stringify({
      success: true,
      data: {
        mutationData: formattedData,
        period: {
          start: startDate,
          end: endDate,
          filter
        }
      }
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (error) {
    console.error('Error fetching mutation report:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
