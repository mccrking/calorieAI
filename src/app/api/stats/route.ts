import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7'
    const days = Math.min(Number(range), 30)

    // Get entries for the last N days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    const entries = await db.foodEntry.findMany({
      where: {
        date: {
          gte: startStr,
          lte: endStr,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Group by date
    const dailyStats: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }> = {}

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      dailyStats[key] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
    }

    for (const entry of entries) {
      if (dailyStats[entry.date]) {
        dailyStats[entry.date].calories += entry.calories
        dailyStats[entry.date].protein += entry.protein
        dailyStats[entry.date].carbs += entry.carbs
        dailyStats[entry.date].fat += entry.fat
        dailyStats[entry.date].count += 1
      }
    }

    const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    }))

    // Compute averages
    const totalDays = Object.keys(dailyStats).length
    const avgCalories = Math.round(entries.reduce((s, e) => s + e.calories, 0) / totalDays)
    const avgProtein = Math.round(entries.reduce((s, e) => s + e.protein, 0) / totalDays)

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        averages: {
          calories: avgCalories,
          protein: avgProtein,
        },
        totalEntries: entries.length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}