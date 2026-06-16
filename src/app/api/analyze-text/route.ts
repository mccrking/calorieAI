import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No food description provided' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a professional nutritionist AI assistant. Your job is to analyze food descriptions and provide accurate nutritional estimates.

You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "name": "descriptive food name",
  "calories": number,
  "protein": number_in_grams,
  "carbs": number_in_grams,
  "fat": number_in_grams,
  "fiber": number_in_grams,
  "serving": "serving size description",
  "confidence": number_between_0_and_100
}

Rules:
- Use USDA or standard nutritional databases for accuracy
- If quantity is not specified, assume a standard serving size
- Handle multiple foods by combining their nutritional values
- If the input is ambiguous, make reasonable assumptions
- Round calories to whole numbers, macros to 1 decimal place`
        },
        {
          role: 'user',
          content: text.trim()
        }
      ],
      thinking: { type: 'disabled' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Clean the response - remove markdown code blocks if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let result
    try {
      result = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response', raw: content },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}