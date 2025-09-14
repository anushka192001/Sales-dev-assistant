import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const imageName = params.name;

  const imagesMap: Record<string, string> = {
    'ai-brain': 'ai-brain.jpg',
  };

  const fileName = imagesMap[imageName];
  if (!fileName) {
    console.warn(`Unknown image key: ${imageName}`);
    return new Response('Image not found', { status: 404 });
  }

  const imagePath = path.join(process.cwd(), 'public', 'images', fileName);
  console.log('Reading image from:', imagePath);

  try {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const ext = path.extname(fileName).substring(1);
    const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;

    return new Response(imageBuffer, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('Failed to load image:', error);
    return new Response('Image not found', { status: 404 });
  }
}
