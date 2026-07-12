import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: ${res.statusText}`, { status: res.status });
    }

    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      return new NextResponse('Received HTML instead of an image. If this is a Google Drive link, the file might be private or restricted.', { status: 403 });
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'image/jpeg');
    headers.set('Access-Control-Allow-Origin', '*'); // explicitly allow our canvas to read it

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new NextResponse(`Error fetching image: ${error.message}`, { status: 500 });
  }
}
