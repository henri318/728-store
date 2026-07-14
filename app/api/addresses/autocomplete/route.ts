import { NextRequest, NextResponse } from 'next/server';
import 'server-only';
import { GeoapifyAddressSuggestionAdapter } from '@/modules/users/infrastructure/geoapify-address-suggestion-adapter';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? '';
  if (query.trim().length < 3) return NextResponse.json({ suggestions: [] });
  try {
    const adapter = new GeoapifyAddressSuggestionAdapter(
      process.env.GEOAPIFY_API_KEY ?? '',
    );
    return NextResponse.json({ suggestions: await adapter.search(query) });
  } catch {
    return NextResponse.json(
      {
        error: 'Address suggestions are temporarily unavailable',
        suggestions: [],
      },
      { status: 502 },
    );
  }
}
