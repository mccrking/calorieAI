import { NextRequest, NextResponse } from 'next/server'
import { getProfile, upsertProfile } from '@/lib/database'

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  // Mifflin-St Jeor equation
  // Male: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161 + 166
  // Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
  const base = 10 * weight + 6.25 * height - 5 * age - 161
  if (gender === 'male') {
    return base + 166
  }
  return base
}

function calculateTDEE(bmr: number, activity: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activity] || 1.55
  return Math.round(bmr * multiplier)
}

export async function GET() {
  try {
    let profile = await getProfile()

    if (!profile) {
      // Create default profile
      profile = await upsertProfile({
        name: 'User',
        age: 25,
        weight: 70,
        height: 170,
        gender: 'male',
        activity: 'moderate',
        bmr: calculateBMR(70, 170, 25, 'male'),
        tdee: calculateTDEE(calculateBMR(70, 170, 25, 'male'), 'moderate'),
      })
    }

    return NextResponse.json({ success: true, data: profile })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, age, weight, height, gender, activity } = body

    if (!name || age === undefined || !weight || !height || !gender || !activity) {
      return NextResponse.json(
        { success: false, error: 'Name, age, weight, height, gender, and activity are required' },
        { status: 400 }
      )
    }

    const parsedAge = Math.max(1, Math.min(Number(age), 120))
    const parsedWeight = Math.max(20, Math.min(Number(weight), 500))
    const parsedHeight = Math.max(50, Math.min(Number(height), 300))
    const validGender = gender === 'male' || gender === 'female' ? gender : 'male'
    const validActivity = ACTIVITY_MULTIPLIERS[activity] ? activity : 'moderate'

    const bmr = Math.round(calculateBMR(parsedWeight, parsedHeight, parsedAge, validGender))
    const tdee = calculateTDEE(bmr, validActivity)

    const profile = await upsertProfile({
      name,
      age: parsedAge,
      weight: parsedWeight,
      height: parsedHeight,
      gender: validGender,
      activity: validActivity,
      bmr,
      tdee,
    })

    return NextResponse.json({ success: true, data: profile })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}