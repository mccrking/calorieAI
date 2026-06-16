import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = imageFile.type || 'image/jpeg'

    const zai = await ZAI.create()

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional nutritionist AI. Analyze this food image and estimate its nutritional content.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "name": "descriptive food name",
  "calories": number,
  "protein": number_in_grams,
  "carbs": number_in_grams,
  "fat": number_in_grams,
  "fiber": number_in_grams,
  "serving": "estimated serving size description",
  "confidence": number_between_0_and_100
}

Rules:
- Be as accurate as possible with calorie and macro estimates
- If multiple food items are visible, combine them into one entry or pick the main dish
- Use reasonable estimates based on standard serving sizes
- Round numbers to whole numbers for calories, 1 decimal for macros`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
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