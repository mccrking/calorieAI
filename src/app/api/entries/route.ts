import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const entries = await db.foodEntry.findMany({
      where: { date },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: entries })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, calories, protein, carbs, fat, fiber, serving, mealType, imageUrl, source, date } = body

    if (!name || calories === undefined || !date) {
      return NextResponse.json(
        { success: false, error: 'Name, calories, and date are required' },
        { status: 400 }
      )
    }

    const entry = await db.foodEntry.create({
      data: {
        name,
        calories: Math.round(Number(calories)),
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        fiber: Number(fiber) || 0,
        serving: serving || null,
        mealType: mealType || 'snack',
        imageUrl: imageUrl || null,
        source: source || 'text',
        date,
      },
    })

    return NextResponse.json({ success: true, data: entry })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}