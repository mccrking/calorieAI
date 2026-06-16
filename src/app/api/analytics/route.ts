import { NextRequest, NextResponse } from 'next/server'
import { getEntriesByDateRange } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range') || '7'
    const days = rangeParam === '30' ? 30 : 7

    // Build date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // Fetch all entries in range
    const entries = await getEntriesByDateRange(startStr, endStr)

    // Build daily map with zero-filled entries for each day
    const dailyMap: Record<
      string,
      {
        calories: number
        protein: number
        carbs: number
        fat: number
        entries: number
        meals: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>
      }
    > = {}

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      dailyMap[key] = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        entries: 0,
        meals: {
          breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
          lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
          dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
          snack: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
        },
      }
    }

    // Populate daily map
    for (const entry of entries) {
      if (!dailyMap[entry.date]) continue
      const day = dailyMap[entry.date]
      day.calories += entry.calories
      day.protein += entry.protein
      day.carbs += entry.carbs
      day.fat += entry.fat
      day.entries += 1

      const mealType = entry.mealType || 'snack'
      if (day.meals[mealType]) {
        day.meals[mealType].calories += entry.calories
        day.meals[mealType].protein += entry.protein
        day.meals[mealType].carbs += entry.carbs
        day.meals[mealType].fat += entry.fat
        day.meals[mealType].count += 1
      }
    }

    // Build daily data array
    const dailyData = Object.entries(dailyMap).map(([date, stats]) => ({
      date,
      calories: stats.calories,
      protein: Math.round(stats.protein * 10) / 10,
      carbs: Math.round(stats.carbs * 10) / 10,
      fat: Math.round(stats.fat * 10) / 10,
      entries: stats.entries,
      meals: stats.meals,
    }))

    // Calculate streak: consecutive days with entries from today going backwards
    let currentStreak = 0
    const today = new Date()
    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (dailyMap[key] && dailyMap[key].entries > 0) {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate consistency: % of days with at least 1 entry
    const daysWithEntries = dailyData.filter((d) => d.entries > 0).length
    const consistencyScore = Math.round((daysWithEntries / days) * 100)

    // Calculate averages (only from days with entries)
    const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0)
    const avgCalories = daysWithEntries > 0 ? Math.round(totalCalories / daysWithEntries) : 0
    const avgProtein =
      daysWithEntries > 0
        ? Math.round((entries.reduce((sum, e) => sum + e.protein, 0) / daysWithEntries) * 10) / 10
        : 0
    const avgCarbs =
      daysWithEntries > 0
        ? Math.round((entries.reduce((sum, e) => sum + e.carbs, 0) / daysWithEntries) * 10) / 10
        : 0
    const avgFat =
      daysWithEntries > 0
        ? Math.round((entries.reduce((sum, e) => sum + e.fat, 0) / daysWithEntries) * 10) / 10
        : 0

    // Best and worst day (by calories, among days with entries)
    const daysWithData = dailyData.filter((d) => d.entries > 0)
    let bestDay = null
    let worstDay = null
    if (daysWithData.length > 0) {
      const byCalories = [...daysWithData].sort((a, b) => b.calories - a.calories)
      bestDay = byCalories[0]
      worstDay = byCalories[byCalories.length - 1]
    }

    // Meal breakdown totals across range
    const mealBreakdown = {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
    }

    for (const entry of entries) {
      const mt = entry.mealType || 'snack'
      if (mealBreakdown[mt as keyof typeof mealBreakdown]) {
        const meal = mealBreakdown[mt as keyof typeof mealBreakdown]
        meal.calories += entry.calories
        meal.protein += entry.protein
        meal.carbs += entry.carbs
        meal.fat += entry.fat
        meal.count += 1
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        range: days,
        dailyData,
        currentStreak,
        consistencyScore,
        averages: {
          calories: avgCalories,
          protein: avgProtein,
          carbs: avgCarbs,
          fat: avgFat,
        },
        bestDay,
        worstDay,
        totalEntries: entries.length,
        mealBreakdown,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}