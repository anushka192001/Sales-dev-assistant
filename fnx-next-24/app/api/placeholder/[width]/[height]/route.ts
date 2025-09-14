import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { width: string; height: string } }
) {
  const { width, height } = params;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ddd"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="20">
        ${width}x${height}
      </text>
    </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
    },
  });
}
