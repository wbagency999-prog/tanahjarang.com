// ═══════════════════════════════════════════════════════════
//  REWRITE — Deprecated, redirect ke batch-rewrite
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const limit = request.nextUrl.searchParams.get('limit') || '20';

  // Redirect ke batch-rewrite
  return NextResponse.redirect(
    new URL(`/api/pipeline/batch-rewrite?secret=${secret}&limit=${limit}`, request.url)
  );
}
