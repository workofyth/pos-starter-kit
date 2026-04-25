import { NextRequest } from 'next/server';
import { db } from '@/db';
import { suppliers } from '@/db/schema/pos';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET - Fetch all suppliers
export async function GET(request: NextRequest) {
  try {
    const results = await db
      .select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt));

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, contactPerson, phone, email, address, paymentTerm } = data;

    if (!name || !phone) {
      return new Response(
        JSON.stringify({ success: false, message: 'Name and Phone are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        id: `sup_${nanoid(10)}`,
        name,
        contactPerson,
        phone,
        email,
        address,
        paymentTerm,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return new Response(
      JSON.stringify({ success: true, data: newSupplier }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating supplier:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
