import { NextRequest, NextResponse } from 'next/server'
import { getWaterLogsByDate, createWaterLog } from '@/lib/database'

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

    const waterLogs = await getWaterLogsByDate(date)

    const totalAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0)
    const glassCount = Math.round(totalAmount / 250) // 250ml per glass

    return NextResponse.json({
      success: true,
      data: {
        date,
        totalAmount,
        glassCount,
        logs: waterLogs,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, date } = body

    if (!amount || !date) {
      return NextResponse.json(
        { success: false, error: 'Amount and date are required' },
        { status: 400 }
      )
    }

    const parsedAmount = Math.max(0, Number(amount))

    if (parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const waterLog = await createWaterLog({ amount: parsedAmount, date })

    // Recalculate totals after adding
    const waterLogs = await getWaterLogsByDate(date)

    const totalAmount = waterLogs.reduce((sum, log) => sum + log.amount, 0)
    const glassCount = Math.round(totalAmount / 250)

    return NextResponse.json({
      success: true,
      data: {
        entry: waterLog,
        totalAmount,
        glassCount,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}