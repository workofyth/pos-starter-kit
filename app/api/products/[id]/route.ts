import { NextRequest } from 'next/server';
import { db } from '@/db';
import { products, productPrices, inventory, categories, branches } from '@/db/schema/pos';
import { eq, and, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET a single product by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Get product with related data
    const productData = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        unit: products.unit,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        sellingPrice: productPrices.sellingPrice,
        purchasePrice: productPrices.purchasePrice,
        stock: inventory.quantity,
        minStock: inventory.minStock
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, id))
      .limit(1);
    
    if (productData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: productData[0]
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching product:', error);
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

// PUT - Update a product by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    
    if (existingProduct.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const {
      name,
      description,
      sku,
      barcode,
      image,
      imageUrl,
      categoryId,
      unit,
      profitMargin,
      purchasePrice,
      sellingPrice,
      stock,
      minStock
    } = body;
    
    // Check if new SKU or barcode conflicts with other products
    if (sku && sku !== existingProduct[0].sku) {
      const skuConflict = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.sku, sku),
            sql`${products.id} != ${id}` // Exclude current product from check using SQL
          )
        );
      
      if (skuConflict.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Product with this SKU already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    if (barcode && barcode !== existingProduct[0].barcode) {
      const barcodeConflict = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.barcode, barcode),
            sql`${products.id} != ${id}` // Exclude current product from check using SQL
          )
        );
      
      if (barcodeConflict.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Product with this barcode already exists' 
          }),
          { 
            status: 409, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    // First, get a valid branch ID or handle appropriately
    let branchId: string | null = null;
    try {
      // Attempt to get an existing branch
      const branchList = await db.select({ id: branches.id }).from(branches).limit(1);
      if (branchList.length > 0) {
        branchId = branchList[0].id;
      }
    } catch (error) {
      console.log('No branches found or error querying branches');
    }

    // Validate category exists if categoryId is provided
    let validCategoryId = categoryId;
    if (categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);
      
      if (categoryExists.length === 0) {
        // If category doesn't exist, set categoryId to null
        validCategoryId = null;
      }
    }

    // Update the product using a transaction
    await db.transaction(async (tx) => {
      // Update the product
      await tx
        .update(products)
        .set({
          name: name !== undefined ? name : existingProduct[0].name,
          description: description !== undefined ? description : existingProduct[0].description,
          sku: sku !== undefined ? sku : existingProduct[0].sku,
          barcode: barcode !== undefined ? barcode : existingProduct[0].barcode,
          image: image !== undefined ? image : existingProduct[0].image,
          imageUrl: imageUrl !== undefined ? imageUrl : existingProduct[0].imageUrl,
          categoryId: validCategoryId !== undefined ? validCategoryId : existingProduct[0].categoryId,
          unit: unit !== undefined ? unit : existingProduct[0].unit,
          profitMargin: profitMargin !== undefined ? profitMargin : existingProduct[0].profitMargin,
          updatedAt: new Date()
        })
        .where(eq(products.id, id));
      
      // Update or create product price if provided
      if (purchasePrice !== undefined || sellingPrice !== undefined) {
        const existingPrice = await tx
          .select()
          .from(productPrices)
          .where(eq(productPrices.productId, id))
          .limit(1);
        
        if (existingPrice.length > 0) {
          // Update existing price
          await tx
            .update(productPrices)
            .set({
              purchasePrice: purchasePrice !== undefined ? purchasePrice.toString() : existingPrice[0].purchasePrice,
              sellingPrice: sellingPrice !== undefined ? sellingPrice.toString() : existingPrice[0].sellingPrice,
              branchId: branchId, // Update branchId if available
              updatedAt: new Date()
            })
            .where(eq(productPrices.productId, id));
        } else {
          // Create new price entry
          await tx.insert(productPrices).values({
            id: `pp_${nanoid(10)}`,
            productId: id,
            branchId: branchId, // Use the valid branch ID or null
            purchasePrice: (purchasePrice || '0').toString(),
            sellingPrice: (sellingPrice || '0').toString(),
            effectiveDate: new Date(),
            createdAt: new Date()
          });
        }
      }
      
      // Update or create inventory if provided and a valid branch exists
      if ((stock !== undefined || minStock !== undefined) && branchId) {
        const existingInventory = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, id),
              eq(inventory.branchId, branchId)
            )
          )
          .limit(1);
        
        if (existingInventory.length > 0) {
          // Update existing inventory
          await tx
            .update(inventory)
            .set({
              quantity: stock !== undefined ? stock : existingInventory[0].quantity,
              minStock: minStock !== undefined ? minStock : existingInventory[0].minStock,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(inventory.productId, id),
                eq(inventory.branchId, branchId)
              )
            );
        } else {
          // Create new inventory entry for the branch
          await tx.insert(inventory).values({
            id: `inv_${nanoid(10)}`,
            productId: id,
            branchId: branchId,
            quantity: stock !== undefined ? stock : 0,
            minStock: minStock !== undefined ? minStock : 5,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    });
    
    // Return the updated product with related data
    const [updatedProduct] = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        barcode: products.barcode,
        image: products.image,
        imageUrl: products.imageUrl,
        unit: products.unit,
        profitMargin: products.profitMargin,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        sellingPrice: productPrices.sellingPrice,
        purchasePrice: productPrices.purchasePrice,
        stock: inventory.quantity,
        minStock: inventory.minStock
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(productPrices, eq(products.id, productPrices.productId))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, id))
      .limit(1);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Product updated successfully',
        data: updatedProduct
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error updating product:', error);
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

// DELETE a product by ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product ID is required' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    
    if (existingProduct.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Product not found' 
        }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Delete the product (this will also delete related records due to cascade)
    await db
      .delete(products)
      .where(eq(products.id, id));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Product deleted successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
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