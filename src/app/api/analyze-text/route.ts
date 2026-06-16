import { NextRequest, NextResponse } from 'next/server'
import { analyzeFoodText } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No food description provided' },
        { status: 400 }
      )
    }

    const result = await analyzeFoodText(text)

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}