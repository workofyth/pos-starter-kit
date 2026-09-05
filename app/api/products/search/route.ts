import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories } from '@/db/schema/pos';
import { eq, and, or, ilike, desc, asc, count, sql, SQL } from 'drizzle-orm';
import { requireOnboarded, subscriptionGuardResponse } from '@/lib/subscription-guard';

export const dynamic = 'force-dynamic';

/** Escape LIKE/ILIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** parseInt that never yields NaN (which would blow up LIMIT/OFFSET). */
function toInt(value: string | null, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Treat the literal strings browsers/mobile send for missing values as empty. */
function cleanParam(value: string | null): string {
  const trimmed = (value || '').trim();
  return trimmed === 'null' || trimmed === 'undefined' ? '' : trimmed;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOnboarded();
    if (!guard.ok) return subscriptionGuardResponse(guard);
    const storeId = guard.storeId;

    const { searchParams } = new URL(request.url);

    const search = cleanParam(searchParams.get('q') || searchParams.get('search'));
    const barcode = cleanParam(searchParams.get('barcode'));
    const category = cleanParam(searchParams.get('category') || searchParams.get('categoryId'));
    const brand = cleanParam(searchParams.get('brand'));
    const minPrice = cleanParam(searchParams.get('minPrice'));
    const maxPrice = cleanParam(searchParams.get('maxPrice'));
    const inStock = cleanParam(searchParams.get('inStock'));
    const branchId = cleanParam(searchParams.get('branchId'));

    const requestedSort = cleanParam(searchParams.get('sortBy'));
    // With a text query, relevance beats alphabetical: the POS/mobile client
    // takes data[0] after a scan, so an exact barcode/SKU hit must come first.
    const sortBy = requestedSort || (search ? 'relevance' : 'name');
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';
    const page = Math.max(1, toInt(searchParams.get('page'), 1));
    const limit = Math.min(100, Math.max(1, toInt(searchParams.get('limit'), 20)));
    const offset = (page - 1) * limit;

    // Subquery for branch/store inventory stock
    const stockSubquery = db
      .select({
        productId: inventory.productId,
        totalStock: sql<number>`CAST(COALESCE(SUM(${inventory.quantity}), 0) AS INTEGER)`.as('total_stock'),
        maxMinStock: sql<number>`CAST(COALESCE(MAX(${inventory.minStock}), 0) AS INTEGER)`.as('max_min_stock')
      })
      .from(inventory)
      .where(and(
        eq(inventory.storeId, storeId),
        branchId ? eq(inventory.branchId, branchId) : undefined
      ))
      .groupBy(inventory.productId)
      .as('stock_sub');

    // Effective price per product: branch-specific first, then the store-wide
    // (NULL branch) price, then any other branch as a last resort.
    const branchPriority = branchId
      ? sql`CASE
          WHEN ${productPrices.branchId} = ${branchId} THEN 0
          WHEN ${productPrices.branchId} IS NULL THEN 1
          ELSE 2 END`
      : sql`CASE WHEN ${productPrices.branchId} IS NULL THEN 0 ELSE 1 END`;

    const priceSubquery = db
      .selectDistinctOn([productPrices.productId], {
        productId: productPrices.productId,
        sellingPrice: productPrices.sellingPrice,
        customerPrice: productPrices.customerPrice,
        purchasePrice: productPrices.purchasePrice,
        effectiveDate: productPrices.effectiveDate,
      })
      .from(productPrices)
      .where(eq(productPrices.storeId, storeId))
      .orderBy(productPrices.productId, asc(branchPriority), desc(productPrices.effectiveDate))
      .as('price_sub');

    const effectiveSellingPrice = sql<string>`COALESCE(${priceSubquery.sellingPrice}, '0.00')`;
    const effectiveStock = sql<number>`COALESCE(${stockSubquery.totalStock}, 0)`;

    // Build filter conditions
    const whereConditions: (SQL<unknown> | undefined)[] = [eq(products.storeId, storeId)];

    // Catalog services (jasa) are managed & sold via the Service/Mekanik menus —
    // only include them in free-text/browse search when explicitly requested.
    // An exact barcode/SKU lookup is exempt: that's how a client (mobile POS
    // included) resolves a specific mechanic/service's auto-provisioned
    // SVC-/SRV- product, so excluding it there made every jasa item
    // unfindable ("Product jasa tidak ditemukan di cabang ini").
    const includeServices = cleanParam(searchParams.get('includeServices')) === 'true';
    if (!includeServices && !barcode) {
      whereConditions.push(eq(products.isService, false));
    }

    if (barcode) {
      // A scan is an identity lookup: match the code exactly, on barcode or SKU.
      whereConditions.push(or(eq(products.barcode, barcode), eq(products.sku, barcode)));
    } else if (search) {
      // Every whitespace-separated token must match somewhere, so "kopi susu"
      // finds "Kopi Gula Susu" instead of returning nothing.
      const tokens = search.split(/\s+/).filter(Boolean).slice(0, 6);
      for (const token of tokens) {
        const pattern = `%${escapeLike(token)}%`;
        whereConditions.push(or(
          ilike(products.name, pattern),
          ilike(products.sku, pattern),
          ilike(products.barcode, pattern),
          ilike(products.brand, pattern)
        ));
      }
    }

    if (brand) {
      whereConditions.push(ilike(products.brand, `%${escapeLike(brand)}%`));
    }

    if (category) {
      whereConditions.push(or(
        eq(products.categoryId, category),
        eq(categories.code, category),
        ilike(categories.name, `%${escapeLike(category)}%`)
      ));
    }

    // Compare against the same COALESCEd value the response reports, otherwise
    // products without a price row silently vanish from any price-filtered list.
    if (minPrice && !Number.isNaN(Number(minPrice))) {
      whereConditions.push(sql`CAST(${effectiveSellingPrice} AS NUMERIC) >= ${minPrice}`);
    }
    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      whereConditions.push(sql`CAST(${effectiveSellingPrice} AS NUMERIC) <= ${maxPrice}`);
    }

    // Services carry no inventory rows, so they must never be filtered out as
    // "out of stock" — they are always sellable.
    if (inStock === 'true') {
      whereConditions.push(sql`(${products.isService} = TRUE OR ${effectiveStock} > 0)`);
    } else if (inStock === 'false') {
      whereConditions.push(sql`(${products.isService} = FALSE AND ${effectiveStock} <= 0)`);
    }

    const whereClause = and(...whereConditions);

    // Relevance: exact identifier hits, then prefix hits, then the rest.
    const loweredSearch = search.toLowerCase();
    const prefixPattern = `${escapeLike(loweredSearch)}%`;
    const relevanceExpr = sql`CASE
      WHEN LOWER(${products.barcode}) = ${loweredSearch} THEN 0
      WHEN LOWER(${products.sku}) = ${loweredSearch} THEN 1
      WHEN LOWER(${products.name}) = ${loweredSearch} THEN 2
      WHEN LOWER(${products.barcode}) LIKE ${prefixPattern} THEN 3
      WHEN LOWER(${products.sku}) LIKE ${prefixPattern} THEN 4
      WHEN LOWER(${products.name}) LIKE ${prefixPattern} THEN 5
      WHEN LOWER(COALESCE(${products.brand}, '')) LIKE ${prefixPattern} THEN 6
      ELSE 7 END`;

    const orderByClauses: SQL<unknown>[] = [];
    if (sortBy === 'relevance' && search) {
      orderByClauses.push(asc(relevanceExpr), asc(products.name));
    } else if (sortBy === 'sellingPrice') {
      const expr = sql`CAST(${effectiveSellingPrice} AS NUMERIC)`;
      orderByClauses.push(sortOrder === 'desc' ? desc(expr) : asc(expr));
    } else if (sortBy === 'stock') {
      orderByClauses.push(sortOrder === 'desc' ? desc(effectiveStock) : asc(effectiveStock));
    } else if (sortBy === 'createdAt') {
      orderByClauses.push(sortOrder === 'desc' ? desc(products.createdAt) : asc(products.createdAt));
    } else {
      orderByClauses.push(sortOrder === 'desc' ? desc(products.name) : asc(products.name));
    }
    // Stable tiebreaker: without it, equal sort keys let rows repeat or vanish
    // across pages.
    orderByClauses.push(asc(products.id));

    const dataQuery = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        brand: products.brand,
        unit: products.unit,
        isService: products.isService,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categoryCode: categories.code,
        sellingPrice: effectiveSellingPrice,
        customerPrice: sql<string>`COALESCE(${priceSubquery.customerPrice}, '0.00')`,
        purchasePrice: sql<string>`COALESCE(${priceSubquery.purchasePrice}, '0.00')`,
        stock: effectiveStock,
        minStock: sql<number>`COALESCE(${stockSubquery.maxMinStock}, 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId))
      .where(whereClause)
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(stockSubquery, eq(products.id, stockSubquery.productId))
      .leftJoin(priceSubquery, eq(products.id, priceSubquery.productId))
      .where(whereClause);

    const [searchResults, totalCountResult] = await Promise.all([dataQuery, countQuery]);

    const countValue = totalCountResult[0]?.count ?? 0;
    const totalCount = typeof countValue === 'number' ? countValue : parseInt(countValue as string, 10);
    const totalPages = Math.ceil(totalCount / limit);

    // Tell the client whether the top hit is an identity match, so a scanner
    // can auto-add it and a typed query can show a picker instead.
    const term = (barcode || search).toLowerCase();
    const top = searchResults[0];
    const exactMatch = Boolean(
      term && top && (top.barcode?.toLowerCase() === term || top.sku?.toLowerCase() === term)
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: searchResults,
        exactMatch,
        query: { q: search, barcode, branchId, sortBy, sortOrder },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    console.error('Error searching products:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
