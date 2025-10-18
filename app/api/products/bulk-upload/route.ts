import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { db } from '@/db';
import { products, categories } from '@/db/schema/pos';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import fsExtra from 'fs-extra';
import { mkdirp } from 'mkdirp';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Create the images directory if it doesn't exist
const imagesDir = path.join(process.cwd(), 'public', 'assets', 'images', 'products');
mkdirp.sync(imagesDir);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Parse form data
  const form = formidable({
    multiples: true,
    uploadDir: '/tmp',  // Temporary upload directory
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ message: 'Error parsing form data' });
    }

    // Check if file exists
    if (!files.excel || Array.isArray(files.excel)) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    const excelFile = files.excel;
    const filePath = Array.isArray(excelFile) ? excelFile[0].filepath : excelFile.filepath;

    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
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
        return res.status(400).json({ 
          message: 'Validation errors occurred', 
          errors: validationErrors 
        });
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

        // Generate SKU based on category
        // Find the highest existing SKU number for this category
        const categoryProducts = await db.select()
          .from(products)
          .where(eq(products.categoryId, category.id));
        
        let nextNumber = 1;
        if (categoryProducts.length > 0) {
          const categorySKUs = categoryProducts
            .map(p => parseInt(p.sku.replace(category.code, "")))
            .filter(num => !isNaN(num));
          
          if (categorySKUs.length > 0) {
            const maxNum = Math.max(...categorySKUs);
            nextNumber = maxNum + 1;
          }
        }
        
        // Format the number with leading zeros (5 digits)
        const formattedNumber = nextNumber.toString().padStart(5, '0');
        const sku = `${category.code}${formattedNumber}`;

        // Calculate profit margin
        const purchasePrice = parseFloat(row['Purchase Price']) || 0;
        const sellingPrice = parseFloat(row['Selling Price']) || 0;
        const profitMargin = purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice) * 100 : 0;

        // Create product object
        productsToCreate.push({
          id: Date.now().toString() + i, // Create a unique ID
          name: row['Name'],
          sku: sku,
          barcode: "", // Will be auto-generated
          categoryId: category.id,
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          stock: parseInt(row['Stock']) || 0,
          minStock: parseInt(row['Min Stock']) || 5,
          profitMargin: profitMargin,
          description: row['Description'] || "",
          unit: row['Unit'] || "pcs",
          image: row['Image URL'] || null,
          imageUrl: null, // Will be set when image is uploaded or processed
        });
      }

      if (processingErrors.length > 0) {
        return res.status(400).json({ 
          message: 'Processing errors occurred', 
          errors: processingErrors 
        });
      }

      // Insert products into the database
      if (productsToCreate.length > 0) {
        // Generate unique barcodes for each product
        for (const product of productsToCreate) {
          // Generate unique 13-digit barcode starting with "1"
          let newBarcode;
          let isUnique = false;
          do {
            newBarcode = "1" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
            // Check if barcode already exists in the database
            const existingProduct = await db.select().from(products).where(eq(products.barcode, newBarcode));
            isUnique = existingProduct.length === 0;
          } while (!isUnique);
          
          product.barcode = newBarcode;
        }
        
        // Insert all products
        await db.insert(products).values(productsToCreate);
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.status(200).json({ 
        message: `${productsToCreate.length} products successfully added`, 
        count: productsToCreate.length 
      });
    } catch (error) {
      console.error('Error processing Excel file:', error);
      // Clean up uploaded file in case of error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(500).json({ message: 'Error processing Excel file' });
    }
  });
}