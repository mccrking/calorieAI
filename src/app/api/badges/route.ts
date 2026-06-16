import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_BADGES = [
  { key: 'first_scan', name: 'First Scan', description: 'Log food using image recognition', icon: '📷' },
  { key: 'week_streak', name: 'Week Warrior', description: 'Maintain a 7-day logging streak', icon: '🔥' },
  { key: 'protein_goal', name: 'Protein Pro', description: 'Hit your daily protein target', icon: '💪' },
  { key: 'calorie_goal', name: 'Calorie Captain', description: 'Stay within 10% of calorie target', icon: '🎯' },
  { key: 'hydrated', name: 'Hydration Hero', description: 'Drink 8 glasses of water in a day', icon: '💧' },
  { key: 'meal_planner', name: 'Meal Planner', description: 'Generate an AI meal plan', icon: '📋' },
  { key: 'voice_logger', name: 'Voice Logger', description: 'Log food using voice input', icon: '🎤' },
  { key: 'social', name: 'Social Butterfly', description: 'Share your progress with friends', icon: '🤝' },
]

export async function GET() {
  try {
    // Pre-seed badges if they don't exist
    for (const badgeDef of DEFAULT_BADGES) {
      const existing = await db.badge.findUnique({ where: { key: badgeDef.key } })
      if (!existing) {
        await db.badge.create({
          data: {
            key: badgeDef.key,
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
          },
        })
      }
    }

    // Check badge conditions

    // 1. first_scan: any entry with source "image"
    const hasImageEntry = await db.foodEntry.findFirst({ where: { source: 'image' } })
    if (hasImageEntry) {
      await db.badge.upsert({
        where: { key: 'first_scan' },
        update: { unlockedAt: hasImageEntry.createdAt },
        create: {
          key: 'first_scan',
          name: 'First Scan',
          description: 'Log food using image recognition',
          icon: '📷',
          unlockedAt: hasImageEntry.createdAt,
        },
      })
    }

    // 2. week_streak: current streak >= 7
    let currentStreak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayEntry = await db.foodEntry.findFirst({ where: { date: dateStr } })
      if (dayEntry) {
        currentStreak++
      } else {
        break
      }
    }
    if (currentStreak >= 7) {
      await db.badge.upsert({
        where: { key: 'week_streak' },
        update: { unlockedAt: new Date() },
        create: {
          key: 'week_streak',
          name: 'Week Warrior',
          description: 'Maintain a 7-day logging streak',
          icon: '🔥',
          unlockedAt: new Date(),
        },
      })
    }

    // 3. protein_goal: any day where protein sum >= protein target
    const allEntries = await db.foodEntry.findMany()
    const proteinByDate: Record<string, number> = {}
    for (const entry of allEntries) {
      proteinByDate[entry.date] = (proteinByDate[entry.date] || 0) + entry.protein
    }
    for (const [date, protein] of Object.entries(proteinByDate)) {
      const goal = await db.dailyGoal.findUnique({ where: { date } })
      const target = goal?.proteinTarget || 150
      if (protein >= target) {
        const firstEntry = await db.foodEntry.findFirst({ where: { date } })
        if (firstEntry) {
          await db.badge.upsert({
            where: { key: 'protein_goal' },
            update: { unlockedAt: firstEntry.createdAt },
            create: {
              key: 'protein_goal',
              name: 'Protein Pro',
              description: 'Hit your daily protein target',
              icon: '💪',
              unlockedAt: firstEntry.createdAt,
            },
          })
        }
        break
      }
    }

    // 4. calorie_goal: any day within 10% of calorie target
    const caloriesByDate: Record<string, number> = {}
    for (const entry of allEntries) {
      caloriesByDate[entry.date] = (caloriesByDate[entry.date] || 0) + entry.calories
    }
    for (const [date, calories] of Object.entries(caloriesByDate)) {
      const goal = await db.dailyGoal.findUnique({ where: { date } })
      const target = goal?.calorieTarget || 2000
      if (Math.abs(calories - target) / target <= 0.1) {
        const firstEntry = await db.foodEntry.findFirst({ where: { date } })
        if (firstEntry) {
          await db.badge.upsert({
            where: { key: 'calorie_goal' },
            update: { unlockedAt: firstEntry.createdAt },
            create: {
              key: 'calorie_goal',
              name: 'Calorie Captain',
              description: 'Stay within 10% of calorie target',
              icon: '🎯',
              unlockedAt: firstEntry.createdAt,
            },
          })
        }
        break
      }
    }

    // 5. hydrated: any day with water >= 8 glasses (2000ml = 8 * 250ml)
    const waterLogs = await db.waterLog.findMany()
    const waterByDate: Record<string, number> = {}
    for (const log of waterLogs) {
      waterByDate[log.date] = (waterByDate[log.date] || 0) + log.amount
    }
    for (const [date, totalWater] of Object.entries(waterByDate)) {
      const glassCount = Math.round(totalWater / 250)
      if (glassCount >= 8) {
        const firstLog = await db.waterLog.findFirst({ where: { date } })
        if (firstLog) {
          await db.badge.upsert({
            where: { key: 'hydrated' },
            update: { unlockedAt: firstLog.createdAt },
            create: {
              key: 'hydrated',
              name: 'Hydration Hero',
              description: 'Drink 8 glasses of water in a day',
              icon: '💧',
              unlockedAt: firstLog.createdAt,
            },
          })
        }
        break
      }
    }

    // 6. meal_planner: locked for now (just return status - feature not implemented)

    // 7. voice_logger: any entry with source "voice"
    const hasVoiceEntry = await db.foodEntry.findFirst({ where: { source: 'voice' } })
    if (hasVoiceEntry) {
      await db.badge.upsert({
        where: { key: 'voice_logger' },
        update: { unlockedAt: hasVoiceEntry.createdAt },
        create: {
          key: 'voice_logger',
          name: 'Voice Logger',
          description: 'Log food using voice input',
          icon: '🎤',
          unlockedAt: hasVoiceEntry.createdAt,
        },
      })
    }

    // 8. social: always locked (sharing feature not implemented)

    // Fetch all badges with their current state
    const badges = await db.badge.findMany({ orderBy: { key: 'asc' } })

    const badgeList = badges.map((badge) => ({
      id: badge.id,
      key: badge.key,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      unlocked: badge.unlockedAt !== null,
      unlockedAt: badge.unlockedAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        badges: badgeList,
        totalUnlocked: badgeList.filter((b) => b.unlocked).length,
        totalBadges: badgeList.length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
