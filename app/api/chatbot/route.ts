import { NextRequest } from 'next/server';
import { db } from '@/db';
import { 
  branches, 
  categories, 
  products, 
  inventory, 
  inventoryTransactions,
  transactions, 
  appSettings,
  members,
  userBranches,
  productPrices,
  suppliers
} from '@/db/schema/pos';
import { eq, sql, desc, sum, count, and, ilike, or } from 'drizzle-orm';
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

    let fullRawHistory = [...history, ...incomingMessages];
    fullRawHistory = fullRawHistory.map(m => ({
       ...m,
       content: m.content === null ? "" : m.content
    }));

    const cleanMessages = fullRawHistory.slice(-15);

    // FETCH SETTINGS (Tax, etc)
    const settings = await db.select().from(appSettings);
    const groqKey = settings.find((s: any) => s.key === 'groq_api_key')?.value;
    const taxRateStr = settings.find((s: any) => s.key === 'tax_rate')?.value || "10";
    const taxRate = parseFloat(taxRateStr);

    if (!groqKey) throw new Error("API Key Groq not set.");

    const [bc] = await db.select({ value: count() }).from(branches);
    
    const baseContext = `
ANDA POS AI ASSISTANT (GROQ).
PAJAK SISTEM: ${taxRate}%.

PEDOMAN FORMAT OUTPUT (WAJIB KONSISTEN):
1. Setiap rincian barang WAJIB menggunakan Tabel Markdown (No | Item | Qty | Harga | Subtotal).
2. Di bawah tabel, WAJIB tampilkan ringkasan:
   - Subtotal: Rp xxx
   - Pajak (${taxRate}%): Rp xxx
   - Total Akhir: Rp xxx
3. DILARANG memproses 'process_payment' sebelum menampilkan rincian di atas dan user menjawab "Bayar".
4. Setelah transaksi sukses, WAJIB tampilkan: "✅ Transaksi Berhasil! [Nomor Transaksi]".

ATURAN DATA:
- ID Produk harus 'prod_...'. JANGAN gunakan nama sebagai ID.
- Jika lupa ID/Harga, panggil 'search_products'.
    `;

    const tools = [
      {
        type: "function",
        function: {
          name: "get_stock_info",
          description: "Cek stok produk.",
          parameters: { type: "object", properties: { branchName: { type: "string" } } }
        }
      },
      {
        type: "function",
        function: {
          name: "search_products",
          description: "Cari data produk untuk mendapatkan ID ASLI dan Harga Jual.",
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
          name: "process_payment",
          description: "Finalisasi bayar. Masukkan ID asli dan harga asli.",
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
    if (d.error) throw new Error(d.error.message);

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

          if (name === "get_stock_info") {
            const whereClause = [];
            if (args.branchName) whereClause.push(ilike(branches.name, `%${args.branchName}%`));
            rd = await db.select({ branch: branches.name, product: products.name, stock: sum(inventory.quantity) }).from(inventory).innerJoin(products, eq(inventory.productId, products.id)).innerJoin(branches, eq(inventory.branchId, branches.id)).where(and(...whereClause)).groupBy(branches.name, products.name).limit(50);
          } 
          else if (name === "search_products") {
            const res = await db.select({ id: products.id, name: products.name, price: productPrices.sellingPrice }).from(products).leftJoin(productPrices, eq(products.id, productPrices.productId)).where(or(ilike(products.name, `%${args.query || ''}%`), ilike(products.sku, `%${args.query || ''}%`))).limit(5);
            rd = { products: res };
          } 
          else if (name === "process_payment") {
             const subItems = args.items || [];
             let hasFakeId = false;
             for(const i of subItems) { if (!i.productId.startsWith('prod_')) hasFakeId = true; }

             if (hasFakeId) {
                rd = { success: false, message: "ID produk tidak valid. Gunakan search_products." };
             } else {
                const user = session?.user;
                const sub = subItems.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
                const tax = Math.round(sub * (taxRate / 100));
                const apiRes = await fetch(`${new URL(request.url).origin}/api/pos/process-transaction`, {
                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ cashierId: user?.id, paymentMethod: (args.paymentMethod||'cash').toLowerCase(), items: subItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price, totalPrice: i.price*i.quantity })), subtotal: sub, discountAmount: 0, taxAmount: tax, total: sub+tax, paidAmount: args.paidAmount, notes: "Chat Bot (Sync Tax)" })
                });
                rd = await apiRes.json();
             }
          }
          toolResults.push({ tool_call_id: tc.id, role: "tool", name, content: JSON.stringify(rd) });
        }

        const finalRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: baseContext }, ...cleanMessages, message, ...toolResults] })
        });
        const fd = await finalRes.json();
        aiResponseContent = fd.choices?.[0]?.message?.content || "Diverifikasi.";
      }

      const finalHistory = [...cleanMessages, { role: "assistant", content: aiResponseContent }];
      if (redis) await redis.setex(historyKey, 604800, JSON.stringify(finalHistory.slice(-15)));
      
      return new Response(JSON.stringify({ success: true, message: aiResponseContent }), { status: 200 });
    }

  } catch (error) {
    console.error('Chatbot Error:', error);
    return new Response(JSON.stringify({ success: false, message: (error as Error).message }), { status: 500 });
  }
}
