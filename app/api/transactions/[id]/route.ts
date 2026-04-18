import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  transactions, 
  transactionDetails, 
  products 
} from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Fetch transaction by id
    const transactionRecord = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (transactionRecord.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Transaction not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const transaction = transactionRecord[0];

    // Fetch details
    const details = await db
      .select({
        id: transactionDetails.id,
        productId: transactionDetails.productId,
        quantity: transactionDetails.quantity,
        unitPrice: transactionDetails.unitPrice,
        totalPrice: transactionDetails.totalPrice,
        productName: products.name,
        productSku: products.sku
      })
      .from(transactionDetails)
      .leftJoin(products, eq(transactionDetails.productId, products.id))
      .where(eq(transactionDetails.transactionId, id));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...transaction,
          details
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: (error as Error).message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
