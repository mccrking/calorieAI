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

    let goal = await db.dailyGoal.findUnique({
      where: { date },
    })

    // If no goal for this date, create default
    if (!goal) {
      goal = await db.dailyGoal.create({
        data: {
          date,
          calorieTarget: 2000,
          proteinTarget: 150,
          carbTarget: 250,
          fatTarget: 65,
        },
      })
    }

    return NextResponse.json({ success: true, data: goal })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, calorieTarget, proteinTarget, carbTarget, fatTarget } = body

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      )
    }

    const goal = await db.dailyGoal.upsert({
      where: { date },
      update: {
        ...(calorieTarget !== undefined && { calorieTarget: Number(calorieTarget) }),
        ...(proteinTarget !== undefined && { proteinTarget: Number(proteinTarget) }),
        ...(carbTarget !== undefined && { carbTarget: Number(carbTarget) }),
        ...(fatTarget !== undefined && { fatTarget: Number(fatTarget) }),
      },
      create: {
        date,
        calorieTarget: Number(calorieTarget) || 2000,
        proteinTarget: Number(proteinTarget) || 150,
        carbTarget: Number(carbTarget) || 250,
        fatTarget: Number(fatTarget) || 65,
      },
    })

    return NextResponse.json({ success: true, data: goal })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}