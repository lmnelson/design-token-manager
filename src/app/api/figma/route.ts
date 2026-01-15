import { NextRequest, NextResponse } from 'next/server';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, accessToken } = body;

    if (!endpoint || !accessToken) {
      return NextResponse.json(
        { error: 'Missing endpoint or accessToken' },
        { status: 400 }
      );
    }

    // Validate endpoint to prevent SSRF
    if (!endpoint.startsWith('/files/') && !endpoint.startsWith('/images/')) {
      return NextResponse.json(
        { error: 'Invalid endpoint' },
        { status: 400 }
      );
    }

    const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(
        { error: error.message || `Figma API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Figma API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Figma API' },
      { status: 500 }
    );
  }
}
