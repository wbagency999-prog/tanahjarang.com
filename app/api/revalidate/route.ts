import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { docId, slug } = body

    // Revalidate homepage
    revalidatePath('/')

    // Revalidate specific article page
    if (slug) {
      revalidatePath(`/berita/${slug}`)
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      docId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Revalidation failed', details: String(err) },
      { status: 500 }
    )
  }
}
