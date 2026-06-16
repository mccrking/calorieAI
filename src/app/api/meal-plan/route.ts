import { NextRequest, NextResponse } from 'next/server'
import { generateMealPlan } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { goals, preferences, allergies, days = 7 } = body

    if (!goals) {
      return NextResponse.json(
        { success: false, error: 'Goals are required' },
        { status: 400 }
      )
    }

    const numDays = Math.min(Math.max(Number(days) || 7, 1), 14)

    const systemPrompt = `You are an expert nutritionist and meal planner. Your job is to create personalized weekly meal plans with exact macronutrient calculations.

You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "plan": [
    {
      "day": 1,
      "dayLabel": "Monday",
      "meals": {
        "breakfast": {
          "name": "meal name",
          "description": "brief description of the meal",
          "calories": number,
          "protein": number_in_grams,
          "carbs": number_in_grams,
          "fat": number_in_grams
        },
        "lunch": {
          "name": "meal name",
          "description": "brief description of the meal",
          "calories": number,
          "protein": number_in_grams,
          "carbs": number_in_grams,
          "fat": number_in_grams
        },
        "dinner": {
          "name": "meal name",
          "description": "brief description of the meal",
          "calories": number,
          "protein": number_in_grams,
          "carbs": number_in_grams,
          "fat": number_in_grams
        },
        "snack": {
          "name": "meal name",
          "description": "brief description of the meal",
          "calories": number,
          "protein": number_in_grams,
          "carbs": number_in_grams,
          "fat": number_in_grams
        }
      },
      "dayTotals": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }
    }
  ],
  "dailyTarget": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- Create exactly ${numDays} days of meals
- Each day must have breakfast, lunch, dinner, and at least one snack
- Distribute calories appropriately: ~30% breakfast, ~35% lunch, ~30% dinner, ~5% snacks (adjust to hit targets)
- Total daily calories must be within 5% of the calorie target
- Protein, carbs, and fat must be within 10% of their respective targets
- Use diverse meals - avoid repeating the same meals across days
- Include whole foods, lean proteins, vegetables, and healthy fats
- Keep meals practical and achievable for home cooking
- If allergies are specified, strictly avoid those ingredients
- If preferences are specified, prioritize those food types
- Round calories to whole numbers, macros to 1 decimal place
- Make the plan varied and enjoyable`

    const userMessage = `Please create a ${numDays}-day meal plan with these goals:
- Daily calorie target: ${goals.calories || 2000} kcal
- Daily protein target: ${goals.protein || 150}g
- Daily carbs target: ${goals.carbs || 250}g
- Daily fat target: ${goals.fat || 65}g${preferences ? `\n- Food preferences: ${preferences}` : ''}${allergies ? `\n- Allergies to avoid: ${allergies}` : ''}

Generate the complete meal plan.`

    const result = await generateMealPlan(systemPrompt, userMessage)

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}