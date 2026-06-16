import { NextRequest, NextResponse } from 'next/server'
import { getGoalByDate, upsertGoal, createGoalIfNotExists } from '@/lib/database'

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

    let goal = await getGoalByDate(date)

    // If no goal for this date, create default
    if (!goal) {
      goal = await createGoalIfNotExists(date)
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

    const goal = await upsertGoal(date, {
      ...(calorieTarget !== undefined && { calorieTarget: Number(calorieTarget) }),
      ...(proteinTarget !== undefined && { proteinTarget: Number(proteinTarget) }),
      ...(carbTarget !== undefined && { carbTarget: Number(carbTarget) }),
      ...(fatTarget !== undefined && { fatTarget: Number(fatTarget) }),
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