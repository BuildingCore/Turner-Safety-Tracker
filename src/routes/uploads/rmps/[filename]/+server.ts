import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as fs from 'fs';
import * as path from 'path';

export const GET: RequestHandler = ({ params }) => {
  const { filename } = params;
  
  // Security: prevent path traversal attacks
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw error(400, 'Invalid filename');
  }

  const filePath = path.join(process.cwd(), 'uploads', 'rmps', filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw error(404, 'File not found');
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (err) {
    console.error('Error reading file:', err);
    throw error(500, 'Error reading file');
  }
};