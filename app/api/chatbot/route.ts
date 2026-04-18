import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  branches, 
  categories, 
  brands, 
  products, 
  inventory, 
  transactions, 
  transactionDetails,
  appSettings,
  members,
  suppliers,
  discounts,
  userBranches
} from '@/db/schema/pos';
import { eq, sql, desc, sum, count, avg } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    // Get Groq API Key from database settings first, fallback to env
    let apiKey = process.env.GROQ_API_KEY;
    
    try {
      const setting = await db.select()
        .from(appSettings)
        .where(eq(appSettings.key, 'groq_api_key'));
      
      if (setting && setting.length > 0) {
        apiKey = setting[0].value;
      }
    } catch (e) {
      console.warn('Could not fetch API key from DB, using env fallback');
    }
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Groq API Key not configured. Please set it in Settings > Integration.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Gather System Context (Extensive version)
    
    // Statistics & Counts
    const [branchCount] = await db.select({ value: count() }).from(branches);
    const [productCount] = await db.select({ value: count() }).from(products);
    const [categoryCount] = await db.select({ value: count() }).from(categories);
    const [brandCount] = await db.select({ value: count() }).from(brands);
    const [memberCount] = await db.select({ value: count() }).from(members);
    const [supplierCount] = await db.select({ value: count() }).from(suppliers);
    const [employeeCount] = await db.select({ value: count() }).from(userBranches);
    
    // Lists (Limited)
    const categoryList = await db.select({ name: categories.name }).from(categories).limit(20);
    const brandList = await db.select({ name: brands.name }).from(brands).limit(20);
    const activeDiscounts = await db.select({ name: discounts.name, value: discounts.value, type: discounts.type }).from(discounts).where(eq(discounts.isActive, true));

    // Revenue Summary (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const salesTrend = await db
      .select({
        date: sql`DATE(${transactions.createdAt})`,
        revenue: sum(transactions.total)
      })
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${sevenDaysAgo} AND ${transactions.status} = 'completed'`)
      .groupBy(sql`DATE(${transactions.createdAt})`)
      .orderBy(sql`DATE(${transactions.createdAt})`);

    // Low Stock Products Details
    const lowStockItems = await db
      .select({
        name: products.name,
        qty: inventory.quantity,
        min: inventory.minStock,
        branch: branches.name
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .innerJoin(branches, eq(inventory.branchId, branches.id))
      .where(sql`${inventory.quantity} <= ${inventory.minStock}`)
      .limit(10);

    // Revenue Summary (Total)
    const [totalRevenue] = await db.select({ value: sum(transactions.total) }).from(transactions).where(eq(transactions.status, 'completed'));
    
    // Recent Transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        number: transactions.transactionNumber,
        total: transactions.total,
        date: transactions.createdAt
      })
      .from(transactions)
      .where(eq(transactions.status, 'completed'))
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    // Top Selling Products (by quantity)
    const topProducts = await db
      .select({
        name: products.name,
        totalQty: sum(transactionDetails.quantity)
      })
      .from(transactionDetails)
      .innerJoin(products, eq(transactionDetails.productId, products.id))
      .groupBy(products.name)
      .orderBy(desc(sum(transactionDetails.quantity)))
      .limit(5);

    // Revenue per Branch
    const revenueByBranch = await db
      .select({
        name: branches.name,
        revenue: sum(transactions.total)
      })
      .from(transactions)
      .innerJoin(branches, eq(transactions.branchId, branches.id))
      .where(eq(transactions.status, 'completed'))
      .groupBy(branches.name)
      .orderBy(desc(sum(transactions.total)));

    // Stock per Branch
    const stockByBranch = await db
      .select({
        name: branches.name,
        totalStock: sum(inventory.quantity)
      })
      .from(inventory)
      .innerJoin(branches, eq(inventory.branchId, branches.id))
      .groupBy(branches.name);

    // Branch Details
    const branchDetails = await db.select({ name: branches.name, type: branches.type, address: branches.address }).from(branches);

    // Top Members (by points/activity)
    const topMembers = await db.select({ name: members.name, points: members.points }).from(members).orderBy(desc(members.points)).limit(5);

    const context = `
SYSTEM KNOWLEDGE BASE:
-------------------------
STATISTIK UMUM:
- Cabang: ${branchCount.value}
- Produk: ${productCount.value}
- Kategori: ${categoryCount.value}
- Brand: ${brandCount.value}
- Member: ${memberCount.value}
- Supplier: ${supplierCount.value}
- Karyawan: ${employeeCount.value}
- Total Revenue: Rp ${Number(totalRevenue.value || 0).toLocaleString()}

DETAIL CABANG:
${branchDetails.map(b => `- ${b.name} (${b.type}): ${b.address}`).join('\n')}

PERFORMA PENJUALAN PER CABANG:
${revenueByBranch.map(r => `- ${r.name}: Rp ${Number(r.revenue).toLocaleString()}`).join('\n')}

DISTRIBUSI STOK PER CABANG:
${stockByBranch.map(s => `- ${s.name}: ${Number(s.totalStock).toLocaleString()} unit`).join('\n')}

DAFTAR KATEGORI (Sebagian): ${categoryList.map(c => c.name).join(', ')}
DAFTAR BRAND (Sebagian): ${brandList.map(b => b.name).join(', ')}
DISKON AKTIF: ${activeDiscounts.map(d => `${d.name} (${d.value}${d.type === 'percentage' ? '%' : ' IDR'})`).join(', ') || 'Tidak ada'}

TREN PENJUALAN (7 HARI TERAKHIR):
${salesTrend.map(s => `- ${s.date}: Rp ${Number(s.revenue).toLocaleString()}`).join('\n')}

PERINGATAN STOK RENDAH:
${lowStockItems.map(i => `- ${i.name} (${i.branch}): ${i.qty}/${i.min}`).join('\n')}

TRANSAKSI TERBARU:
${recentTransactions.map(t => `- ${t.number}: Rp ${Number(t.total).toLocaleString()} (${new Date(t.date).toLocaleDateString()})`).join('\n')}

PRODUK TERLARIS:
${topProducts.map(p => `- ${p.name}: ${p.totalQty} terjual`).join('\n')}

MEMBER TERBAIK:
${topMembers.map(m => `- ${m.name}: ${m.points} poin`).join('\n')}

INSTRUKSI PENTING:
Anda adalah POS Business Insight AI. Gunakan data di atas untuk menjawab pertanyaan USER secara akurat dan profesional dalam Bahasa Indonesia. 
Jika USER bertanya tentang sesuatu yang spesifik yang tidak ada di data di atas, berikan saran berdasarkan wawasan bisnis umum yang relevan dengan POS.
`;

    // 2. Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: context },
          ...messages
        ],
        temperature: 0.6,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Groq API error');
    }

    const groqData = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: groqData.choices[0].message.content 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chatbot API Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
