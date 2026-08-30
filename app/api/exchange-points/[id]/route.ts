import { NextRequest } from 'next/server';
import { db } from '@/db';
import { exchangePoints } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import { requireOnboarded, requireActiveAccess, subscriptionGuardResponse } from '@/lib/subscription-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;
    const item = await db
      .select()
      .from(exchangePoints)
      .where(and(eq(exchangePoints.id, id), eq(exchangePoints.storeId, guard.storeId)))
      .limit(1);
    
    if (item.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Item not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data: item[0] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;
    const body = await request.json();
    const { pointExchangeTotal, exchangeItem, productId } = body;

    const [updatedItem] = await db
      .update(exchangePoints)
      .set({
        pointExchangeTotal: pointExchangeTotal !== undefined ? parseInt(pointExchangeTotal.toString()) : undefined,
        exchangeItem: exchangeItem !== undefined ? exchangeItem : undefined,
        productId: productId !== undefined ? productId : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(exchangePoints.id, id), eq(exchangePoints.storeId, guard.storeId)))
      .returning();
    
    if (!updatedItem) {
      return new Response(
        JSON.stringify({ success: false, message: 'Item not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data: updatedItem }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireActiveAccess();
    if (!guard.ok) return subscriptionGuardResponse(guard);

    const { id } = await params;
    await db
      .delete(exchangePoints)
      .where(and(eq(exchangePoints.id, id), eq(exchangePoints.storeId, guard.storeId)));

    return new Response(
      JSON.stringify({ success: true, message: 'Item deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error', error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
