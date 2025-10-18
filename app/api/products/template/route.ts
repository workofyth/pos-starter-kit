import { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Create sample data for the template
  const templateData = [
    {
      'Name': 'Sample Product 1',
      'Category Code': 'FB',
      'Purchase Price': 45000,
      'Selling Price': 50000,
      'Stock': 10,
      'Description': 'Sample product description',
      'Min Stock': 5,
      'Unit': 'pcs',
      'Image URL': 'https://example.com/product1.jpg'
    },
    {
      'Name': 'Sample Product 2',
      'Category Code': 'SL',
      'Purchase Price': 70000,
      'Selling Price': 75000,
      'Stock': 5,
      'Description': 'Sample product description',
      'Min Stock': 3,
      'Unit': 'pcs',
      'Image URL': 'https://example.com/product2.jpg'
    },
    {
      'Name': '',
      'Category Code': '',
      'Purchase Price': '',
      'Selling Price': '',
      'Stock': '',
      'Description': '',
      'Min Stock': '',
      'Unit': '',
      'Image URL': ''
    }
  ];

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Create a workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Name
    { wch: 15 }, // Category Code
    { wch: 15 }, // Purchase Price
    { wch: 15 }, // Selling Price
    { wch: 10 }, // Stock
    { wch: 30 }, // Description
    { wch: 10 }, // Min Stock
    { wch: 10 }, // Unit
    { wch: 30 }  // Image URL
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add instructions in a separate sheet
  const instructionData = [
    ['Field', 'Description', 'Example'],
    ['Name', 'Product name', 'Freebase E-Liquid 3mg'],
    ['Category Code', 'Must match existing category codes', 'FB (for Freebase), SL (for SaltNic), AC (for Accessories), BT (for Battery), CL (for Coil)'],
    ['Purchase Price', 'Price in IDR without commas', '45000'],
    ['Selling Price', 'Price in IDR without commas', '50000'],
    ['Stock', 'Initial stock quantity', '10'],
    ['Description', 'Product description', 'Premium e-liquid with fruit flavor'],
    ['Min Stock', 'Minimum stock threshold', '5'],
    ['Unit', 'Unit of measurement', 'pcs, kg, ltr, etc.'],
    ['Image URL', 'URL to product image', 'https://example.com/image.jpg']
  ];
  
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionData);
  XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');
  
  // Convert to buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  
  // Set headers for file download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="product_template.xlsx"');
  
  // Send the buffer
  res.status(200).send(buffer);
}