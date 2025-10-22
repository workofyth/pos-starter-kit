import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import { mkdirp } from 'mkdirp';
import { db } from '@/db';
import { products } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

// Create the images directory if it doesn't exist
const imagesDir = path.join(process.cwd(), 'public', 'assets', 'images', 'products');
mkdirp.sync(imagesDir);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract file from FormData
    const imageFile = formData.get('image') as File | null;
    const productId = formData.get('productId') as string | null;
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({ message: 'Image file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle temporary image upload (no productId provided)
    const isTemporaryUpload = !productId;

    // Convert File object to buffer and save
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const originalName = imageFile.name || 'image';
    const fileExtension = path.extname(originalName);
    
    // Sanitize the filename to remove special characters
    const sanitizedBaseName = originalName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_{2,}/g, '_'); // Replace multiple underscores with single underscore
    const sanitizedFileName = sanitizedBaseName + fileExtension;
    
    // Create the final path
    const finalPath = path.join(imagesDir, sanitizedFileName);
    
    // Write the file to the final location
    fs.writeFileSync(finalPath, buffer);
    
    // Update the product record with the image URL if productId is provided
    if (productId) {
      const imageUrl = `/assets/images/products/${sanitizedFileName}`;
      await db.update(products)
        .set({ 
          imageUrl, // This corresponds to the imageUrl field in the schema
          image: imageUrl // Also update the image field for consistency
        })
        .where(eq(products.id, productId));
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: `/assets/images/products/${sanitizedFileName}`,
          fileName: sanitizedFileName
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error handling image upload:', error);
    return new Response(
      JSON.stringify({ message: 'Error handling image upload' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}