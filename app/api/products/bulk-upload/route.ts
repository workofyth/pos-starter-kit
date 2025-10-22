import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/db';
import { products, categories, productPrices, inventory } from '@/db/schema/pos';
import { eq, and, desc } from 'drizzle-orm';
import fs from 'fs';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    // Get the formData from the request
    const formData = await request.formData();
    const excelFile = formData.get('excel') as File | null;
    const branchId = formData.get('branchId') as string || null; // Get branchId from form data

    if (!excelFile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Excel file is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate branchId is provided
    if (!branchId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Branch ID is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert File object to buffer
    const bytes = await excelFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Read the Excel file from buffer directly
      const workbook = XLSX.read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate the data
      const requiredFields = ['Name', 'Category Code', 'Purchase Price', 'Selling Price'];
      const validationErrors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        requiredFields.forEach(field => {
          if (!row[field]) {
            validationErrors.push(`Row ${index + 2}: Missing required field '${field}'`);
          }
        });
      });

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Validation errors occurred', 
            errors: validationErrors 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch existing categories to validate codes
      const allCategories = await db.select().from(categories);
      const categoryMap = new Map(allCategories.map(cat => [cat.code, cat]));

      // Process the data and create products
      const productsToCreate = [];
      const processingErrors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Validate category code exists
        const categoryCode = row['Category Code'];
        if (!categoryMap.has(categoryCode)) {
          processingErrors.push(`Row ${i + 2}: Invalid category code '${categoryCode}'`);
          continue;
        }

        const category = categoryMap.get(categoryCode)!;

        // Generate unique ID and SKU
        const productId = `prod_${nanoid(10)}`;
        const nextNumber = Math.floor(Math.random() * 100000); // Generate random number for SKU
        const sku = `${category.code}${nextNumber.toString().padStart(5, '0')}`;

        // Check if SKU or barcode already exists
        let barcode = row['Barcode'] || `1${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
        
        // Verify uniqueness of barcode and SKU
        const existingProduct = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.sku, sku),
              eq(products.barcode, barcode)
            )
          );
        
        if (existingProduct.length > 0) {
          processingErrors.push(`Row ${i + 2}: SKU or barcode already exists`);
          continue;
        }

        // Calculate profit margin
        const purchasePrice = parseFloat(row['Purchase Price']) || 0;
        const sellingPrice = parseFloat(row['Selling Price']) || 0;
        const profitMargin = purchasePrice > 0 ? Number(((sellingPrice - purchasePrice) / purchasePrice * 100).toFixed(2)) : 0;

        // Create product object
        const newProduct = {
          id: productId,
          name: row['Name'] || '',
          description: row['Description'] || '',
          sku,
          barcode,
          categoryId: category.id,
          unit: row['Unit'] || 'pcs',
          profitMargin: profitMargin.toString(),
          image: row['Image URL'] || null,
          imageUrl: null,
        };

        productsToCreate.push({
          product: newProduct,
          purchasePrice,
          sellingPrice,
          stock: parseInt(row['Stock']) || 0,
          minStock: parseInt(row['Min Stock']) || 5
        });
      }

      if (processingErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Processing errors occurred', 
            errors: processingErrors 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Insert products into the database using transactions
      if (productsToCreate.length > 0) {
        for (const productData of productsToCreate) {
          const { product, purchasePrice, sellingPrice, stock, minStock } = productData;

          // Insert product
          await db.insert(products).values(product);

          // Insert product price
          await db.insert(productPrices).values({
            id: `pp_${nanoid(10)}`,
            productId: product.id,
            branchId: null, // Default to null for all branches initially
            purchasePrice: purchasePrice.toString(),
            sellingPrice: sellingPrice.toString(),
            effectiveDate: new Date(),
            createdAt: new Date()
          });

          // Need to get the branch ID from the request parameters
          // Validate that branchId is provided
          if (!branchId) {
            throw new Error('Branch ID is required for inventory creation');
          }
          
          // Insert inventory record for the specified branch
          await db.insert(inventory).values({
            id: `inv_${nanoid(10)}`,
            productId: product.id,
            branchId, // Dynamic branch ID from request parameters
            quantity: stock,
            minStock,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastUpdated: new Date()
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `${productsToCreate.length} products successfully added`, 
          data: {
            count: productsToCreate.length,
            products: productsToCreate.map(p => ({ id: p.product.id, name: p.product.name, sku: p.product.sku }))
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error processing Excel file:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error processing Excel file',
          error: (error as Error).message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in bulk upload handler:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error processing request',
        error: (error as Error).message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}