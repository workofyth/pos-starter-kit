import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import { mkdirp } from 'mkdirp';
import { db } from '@/db';
import { products } from '@/db/schema/pos';
import { eq } from 'drizzle-orm';

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
    multiples: false,
    uploadDir: imagesDir,  // Upload directly to images directory
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ message: 'Error parsing form data' });
    }

    // Check if file exists
    if (!files.image) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    const originalName = imageFile.originalFilename || 'image';
    const fileExtension = path.extname(imageFile.originalFilename || '');
    
    // Sanitize the filename to remove special characters
    const sanitizedBaseName = originalName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_{2,}/g, '_'); // Replace multiple underscores with single underscore
    const sanitizedFileName = sanitizedBaseName + fileExtension;
    
    // Create the final path
    const finalPath = path.join(imagesDir, sanitizedFileName);
    
    try {
      // Move the file to the final location with the sanitized name
      await fsExtra.move(imageFile.filepath, finalPath, { overwrite: true });
      
      // Update the product record with the image URL
      const productId = fields.productId as string[];
      if (productId) {
        const imageUrl = `/assets/images/products/${sanitizedFileName}`;
        await db.update(products)
          .set({ imageUrl })
          .where(eq(products.id, productId));
      }

      res.status(200).json({ 
        message: 'Image uploaded successfully',
        imageUrl: `/assets/images/products/${sanitizedFileName}`,
        fileName: sanitizedFileName
      });
    } catch (error) {
      console.error('Error handling image upload:', error);
      // Clean up the temporary file if upload fails
      if (fs.existsSync(imageFile.filepath)) {
        fs.unlinkSync(imageFile.filepath);
      }
      res.status(500).json({ message: 'Error handling image upload' });
    }
  });
}