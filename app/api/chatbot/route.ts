import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  branches, 
  categories, 
  products, 
  brands,
  inventory, 
  inventoryTransactions,
  transactions, 
  transactionDetails,
  appSettings,
  members,
  userBranches,
  productPrices,
  suppliers
} from '@/db/schema/pos';
import { eq, sql, desc, sum, count, and, ilike, or, lt, lte, gte, ne } from 'drizzle-orm';
import { auth } from "@/lib/auth";
import { getRedis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return new Response(JSON.stringify({ success: false, messages: [] }), { status: 401 });
  const redis = await getRedis();
  if (!redis) return new Response(JSON.stringify({ success: false, messages: [] }));
  const historyKey = `chatbot_history:${session.user.id}`;
  const history = await redis.get(historyKey);
  return new Response(JSON.stringify({ success: true, messages: history ? JSON.parse(history as string) : [] }));
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return new Response(JSON.stringify({ success: false }), { status: 401 });
  const redis = await getRedis();
  if (redis) {
    const historyKey = `chatbot_history:${session.user.id}`;
    await redis.del(historyKey);
  }
  return new Response(JSON.stringify({ success: true }));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });

  try {
    const { messages: incomingMessages } = await request.json();
    const redis = await getRedis();
    const historyKey = `chatbot_history:${session.user.id}`;
    
    let history: any[] = [];
    if (redis) {
      const savedHistory = await redis.get(historyKey);
      if (savedHistory) history = JSON.parse(savedHistory as string);
    }

    // 1. SANITIZE & VALIDATE HISTORY BOUNDARY
    // We slice history but ensure we start at a 'user' message to keep the thread valid for Groq.
    let fullRawHistory = [...history, ...incomingMessages].map(m => ({
       ...m,
       content: m.content === null ? "" : m.content
    }));

    let cleanMessages = fullRawHistory.slice(-12);
    const firstUserIdx = cleanMessages.findIndex(m => m.role === 'user');
    if (firstUserIdx !== -1) cleanMessages = cleanMessages.slice(firstUserIdx);

    const settings = await db.select().from(appSettings);
    const groqKey = settings.find((s: any) => s.key === 'groq_api_key')?.value;
    const taxRateStr = settings.find((s: any) => s.key === 'tax_rate')?.value || "10";
    const taxRate = parseFloat(taxRateStr);

    if (!groqKey) throw new Error("API Key Groq not found.");

    const [bc] = await db.select({ value: count() }).from(branches);

    // Load system prompt from DB, fallback to default if not set
    const defaultPrompt = `ANDA POS AI ASSISTANT (GROQ).
PAJAK SISTEM: {{TAX_RATE}}%.

PEDOMAN FORMAT OUTPUT (WAJIB KONSISTEN):
1. Setiap rincian barang WAJIB menggunakan Tabel Markdown (No | Item | Qty | Harga | Subtotal).
2. Di bawah tabel, WAJIB tampilkan ringkasan:
   - Subtotal: Rp xxx
   - Pajak ({{TAX_RATE}}%): Rp xxx
   - Total Akhir: Rp xxx
3. DILARANG memproses 'process_payment' sebelum menampilkan rincian di atas dan user menjawab "Bayar".
4. Setelah transaksi sukses, WAJIB tampilkan: "✅ Transaksi Berhasil! [Nomor Transaksi]".

ATURAN DATA:
- ID Produk harus ID asli dari database (misal: prod_...). JANGAN gunakan nama.
- Cari ID/Harga via 'search_products' (id dari table products, harga dari product_prices).`;

    // Auto-seed: save default prompt to DB if not yet stored
    const existingPrompt = settings.find((s: any) => s.key === 'ai_system_prompt');
    if (!existingPrompt) {
      await db.insert(appSettings).values({
        key: 'ai_system_prompt',
        value: defaultPrompt,
        description: 'AI Chatbot System Prompt (baseContext)',
      }).onConflictDoNothing();
    }

    const rawPrompt = existingPrompt?.value || defaultPrompt;
    const baseContext = rawPrompt.replace(/\{\{TAX_RATE\}\}/g, String(taxRate));



    const tools = [
      {
        type: "function",
        function: {
          name: "get_stock_info",
          description: "Cek stok produk per cabang. Bisa filter berdasarkan nama cabang dan/atau nama brand.",
          parameters: { 
            type: "object", 
            properties: { 
              branchName: { type: "string", description: "Filter nama cabang" },
              brandName: { type: "string", description: "Filter nama brand produk" }
            } 
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_products",
          description: "Cari produk & dapatkan ID asli serta Harga Jual.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_business_knowledge",
          description: "Mengambil data bisnis lengkap: produk, brand, kategori, cabang, stok kritis/moderat, split produk (pending/approved/rejected), daftar transaksi, dan revenue per cabang. Akses difilter otomatis berdasarkan hak akses user.",
          parameters: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                enum: ["products", "brands", "categories", "branches", "inventory_alerts", "split_status", "transactions", "revenue", "all"],
                description: "Topik data yang ingin diambil"
              }
            },
            required: ["topic"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "process_payment",
          description: "Proses transaksi final.",
          parameters: {
            type: "object",
            properties: {
              items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, name: { type: "string" }, quantity: { type: "number" }, price: { type: "number" } } } },
              paymentMethod: { type: "string", enum: ["cash", "card", "transfer"] },
              paidAmount: { type: "number" },
              branchName: { type: "string" }
            },
            required: ["items", "paymentMethod", "paidAmount", "branchName"]
          }
        }
      }
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: baseContext }, ...cleanMessages],
        tools, tool_choice: "auto", temperature: 0
      })
    });

    const d = await groqRes.json();
    if (d.error) {
       // Silent ignore/retry if history was the cause
       if (d.error.message.includes("Failed to call") || d.error.message.includes("tool")) {
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'system', content: baseContext }, ...incomingMessages],
              tools, tool_choice: "auto", temperature: 0
            })
          });
          const rd = await retryRes.json();
          if (rd.error) throw new Error(rd.error.message);
          return await processCompletion(rd);
       }
       throw new Error(d.error.message);
    }

    return await processCompletion(d);

    async function processCompletion(data: any) {
      const message = data.choices[0].message;
      const toolCalls = message.tool_calls || [];
      let aiResponseContent = message.content || "";

      if (toolCalls.length > 0) {
        const toolResults = [];
        for (const tc of toolCalls) {
          const name = tc.function.name;
          const args = JSON.parse(tc.function.arguments);
          let rd: any = { success: false };

          if (name === "get_business_knowledge") {
            // Determine user's branch access
            const userBranchData = await db.select({
              branchId: userBranches.branchId,
              isMainAdmin: userBranches.isMainAdmin,
              branchType: branches.type,
              branchName: branches.name
            }).from(userBranches)
              .innerJoin(branches, eq(userBranches.branchId, branches.id))
              .where(eq(userBranches.userId, session?.user?.id ?? ''))
              .limit(1);

            const userBranch = userBranchData[0];
            const isMainBranch = userBranch?.isMainAdmin || userBranch?.branchType === 'main';
            const userBranchId = userBranch?.branchId;

            // Branch filter: sub-branch sees only own data; main branch sees all
            const branchFilter = isMainBranch ? [] : [eq(branches.id, userBranchId || '')] ;
            const invBranchFilter = isMainBranch ? [] : [eq(inventory.branchId, userBranchId || '')];
            const txBranchFilter = isMainBranch ? [] : [eq(transactions.branchId, userBranchId || '')];
            const itBranchFilter = isMainBranch ? [] : [eq(inventoryTransactions.branchId, userBranchId || '')];

            const topic = args.topic || 'all';
            const result: any = {};

            if (topic === 'products' || topic === 'all') {
              result.products = await db.select({
                id: products.id, name: products.name, sku: products.sku,
                brand: products.brand, price: productPrices.sellingPrice
              }).from(products)
                .leftJoin(productPrices, eq(products.id, productPrices.productId))
                .limit(50);
            }

            if (topic === 'brands' || topic === 'all') {
              result.brands = await db.select({ id: brands.id, name: brands.name, code: brands.code }).from(brands).limit(30);
            }

            if (topic === 'categories' || topic === 'all') {
              result.categories = await db.select({ id: categories.id, name: categories.name, code: categories.code }).from(categories).limit(30);
            }

            if (topic === 'branches' || topic === 'all') {
              result.branches = await db.select({ id: branches.id, name: branches.name, type: branches.type, address: branches.address })
                .from(branches)
                .where(branchFilter.length ? and(...branchFilter) : sql`1=1`)
                .limit(20);
            }

            if (topic === 'inventory_alerts' || topic === 'all') {
              // Low stock: quantity <= minStock; Moderate: quantity <= minStock*2
              result.lowStock = await db.select({
                branch: branches.name, product: products.name,
                qty: inventory.quantity, minStock: inventory.minStock
              }).from(inventory)
                .innerJoin(products, eq(inventory.productId, products.id))
                .innerJoin(branches, eq(inventory.branchId, branches.id))
                .where(and(
                  ...invBranchFilter,
                  sql`${inventory.quantity} <= ${inventory.minStock}`
                ))
                .orderBy(inventory.quantity)
                .limit(30);

              result.moderateStock = await db.select({
                branch: branches.name, product: products.name,
                qty: inventory.quantity, minStock: inventory.minStock
              }).from(inventory)
                .innerJoin(products, eq(inventory.productId, products.id))
                .innerJoin(branches, eq(inventory.branchId, branches.id))
                .where(and(
                  ...invBranchFilter,
                  sql`${inventory.quantity} > ${inventory.minStock}`,
                  sql`${inventory.quantity} <= ${inventory.minStock} * 2`
                ))
                .orderBy(inventory.quantity)
                .limit(30);
            }

            if (topic === 'split_status' || topic === 'all') {
              result.splitProducts = await db.select({
                id: inventoryTransactions.id,
                product: products.name,
                branch: branches.name,
                qty: inventoryTransactions.quantity,
                status: inventoryTransactions.status,
                notes: inventoryTransactions.notes,
                createdAt: inventoryTransactions.createdAt
              }).from(inventoryTransactions)
                .innerJoin(products, eq(inventoryTransactions.productId, products.id))
                .innerJoin(branches, eq(inventoryTransactions.branchId, branches.id))
                .where(and(
                  eq(inventoryTransactions.type, 'split'),
                  ...itBranchFilter
                ))
                .orderBy(desc(inventoryTransactions.createdAt))
                .limit(30);
            }

            if (topic === 'transactions' || topic === 'all') {
              result.transactions = await db.select({
                number: transactions.transactionNumber,
                branch: branches.name,
                total: transactions.total,
                payment: transactions.paymentMethod,
                status: transactions.status,
                createdAt: transactions.createdAt
              }).from(transactions)
                .innerJoin(branches, eq(transactions.branchId, branches.id))
                .where(txBranchFilter.length ? and(...txBranchFilter) : sql`1=1`)
                .orderBy(desc(transactions.createdAt))
                .limit(30);
            }

            if (topic === 'revenue' || topic === 'all') {
              result.revenue = await db.select({
                branch: branches.name,
                totalRevenue: sum(transactions.total),
                totalTransactions: count(transactions.id)
              }).from(transactions)
                .innerJoin(branches, eq(transactions.branchId, branches.id))
                .where(and(
                  eq(transactions.status, 'completed'),
                  ...txBranchFilter
                ))
                .groupBy(branches.name)
                .orderBy(desc(sum(transactions.total)));
            }

            rd = result;
          }
          else if (name === "get_stock_info") {
            const whereClause = [];
            if (args.branchName) whereClause.push(ilike(branches.name, `%${args.branchName}%`));
            if (args.brandName) whereClause.push(ilike(products.brand, `%${args.brandName}%`));
            rd = await db.select({ branch: branches.name, brand: products.brand, product: products.name, stock: sum(inventory.quantity) })
              .from(inventory)
              .innerJoin(products, eq(inventory.productId, products.id))
              .innerJoin(branches, eq(inventory.branchId, branches.id))
              .where(whereClause.length ? and(...whereClause) : sql`1=1`)
              .groupBy(branches.name, products.brand, products.name)
              .limit(50);
          } 
          else if (name === "search_products") {
            const res = await db.select({ id: products.id, name: products.name, price: productPrices.sellingPrice })
              .from(products)
              .leftJoin(productPrices, eq(products.id, productPrices.productId))
              .where(or(ilike(products.name, `%${args.query || ''}%`), ilike(products.sku, `%${args.query || ''}%`)))
              .limit(5);
            rd = { products: res };

            // Cache valid IDs in Redis so process_payment can verify against them
            if (redis && res.length > 0) {
              const whitelistKey = `valid_product_ids:${session?.user?.id}`;
              const existing = await redis.get(whitelistKey);
              const currentIds: string[] = existing ? JSON.parse(existing as string) : [];
              const newIds = res.map(p => p.id).filter(id => !currentIds.includes(id));
              await redis.setex(whitelistKey, 1800, JSON.stringify([...currentIds, ...newIds]));
            }
          } 
          else if (name === "process_payment") {
             const subItems = args.items || [];
             
             // RESOLVE real IDs from DB using product NAME (AI-provided names are reliable; IDs are not)
             const resolvedItems: any[] = [];
             let failedItem = "";
             for (const i of subItems) {
               const found = await db.select({ id: products.id, name: products.name, price: productPrices.sellingPrice })
                 .from(products)
                 .leftJoin(productPrices, eq(products.id, productPrices.productId))
                 .where(ilike(products.name, `%${i.name || ''}%`))
                 .limit(1);
               if (found.length === 0) {
                 failedItem = i.name || i.productId;
                 break;
               }
               resolvedItems.push({
                 productId: found[0].id,       // Use REAL ID from DB
                 name: found[0].name,
                 quantity: i.quantity,
                 price: Number(found[0].price ?? i.price), // Use REAL price from DB
                 totalPrice: Number(found[0].price ?? i.price) * i.quantity
               });
             }

             if (failedItem) {
                rd = { success: false, message: `Produk '${failedItem}' tidak ditemukan di database. Pastikan nama produk benar.` };
             } else {
                const user = session?.user;
                const discountRate = args.discountRate || 0;
                const sub = resolvedItems.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
                const discountAmt = Math.round(sub * (discountRate / 100));
                const afterDiscount = sub - discountAmt;
                const tax = Math.round(afterDiscount * (taxRate / 100));
                const total = afterDiscount + tax;
                const paid = args.paidAmount || total;
                const change = paid - total;
                const apiRes = await fetch(`${new URL(request.url).origin}/api/pos/process-transaction`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ 
                     cashierId: user?.id, 
                     paymentMethod: (args.paymentMethod||'cash').toLowerCase(), 
                     items: resolvedItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price, totalPrice: i.totalPrice })), 
                     subtotal: sub, 
                     discountAmount: discountAmt, 
                     taxAmount: tax, 
                     total: total, 
                     paidAmount: paid, 
                     notes: "Chat Bot (Sync Verified)" 
                   })
                });
                const resData = await apiRes.json();
                rd = { ...resData, summary: { subtotal: sub, discount: discountAmt, tax, total, paid, change, taxRate } };
             }
          }
          toolResults.push({ tool_call_id: tc.id, role: "tool", name, content: JSON.stringify(rd) });
        }

        const finalRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model: 'llama-3.3-70b-versatile', 
            messages: [{ role: 'system', content: baseContext }, ...cleanMessages, message, ...toolResults],
            tools 
          })
        });
        const fd = await finalRes.json();
        aiResponseContent = fd.choices?.[0]?.message?.content || "Data terverifikasi.";
      }

      const finalHistory = [...cleanMessages, { role: "assistant", content: aiResponseContent }];
      if (redis) await redis.setex(historyKey, 604800, JSON.stringify(finalHistory.slice(-12)));
      
      return new Response(JSON.stringify({ success: true, message: aiResponseContent }), { status: 200 });
    }

  } catch (error) {
    console.error('Chatbot Error:', error);
    return new Response(JSON.stringify({ success: false, message: (error as Error).message }), { status: 500 });
  }
}
