import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get today's entries for context
    const todayStr = new Date().toISOString().split('T')[0]
    const todayEntries = await db.foodEntry.findMany({
      where: { date: todayStr },
    })

    const totalCalories = todayEntries.reduce((sum, e) => sum + e.calories, 0)
    const totalProtein = Math.round(todayEntries.reduce((sum, e) => sum + e.protein, 0) * 10) / 10
    const totalCarbs = Math.round(todayEntries.reduce((sum, e) => sum + e.carbs, 0) * 10) / 10
    const totalFat = Math.round(todayEntries.reduce((sum, e) => sum + e.fat, 0) * 10) / 10

    // Get current goal
    const goal = await db.dailyGoal.findUnique({
      where: { date: todayStr },
    })

    const calorieTarget = goal?.calorieTarget || 2000
    const proteinTarget = goal?.proteinTarget || 150

    const contextInfo = `
Today's intake context (${todayStr}):
- Calories consumed: ${totalCalories} / ${calorieTarget} kcal
- Protein: ${totalProtein} / ${proteinTarget}g
- Carbs: ${totalCarbs}g
- Fat: ${totalFat}g
- Meals logged: ${todayEntries.length}
- Remaining calories: ${calorieTarget - totalCalories} kcal

Use this context when answering nutrition questions. Be encouraging but honest.`

    const systemPrompt = `You are CalorieAI's nutrition assistant 🥗. You help users with diet questions, suggest healthy alternatives, explain macronutrients, and provide personalized nutrition advice.

Key behaviors:
- Be concise and friendly in your responses
- Use emojis occasionally to keep it fun 😊
- When relevant, reference the user's current daily intake
- Suggest specific foods with approximate calories and macros
- Explain why certain foods are good or bad choices
- Help with meal planning suggestions
- Encourage healthy habits without being preachy
- If asked about weight loss, emphasize sustainable approaches
- Be supportive of the user's fitness journey

${contextInfo}`

    // Build messages array with system prompt prepended
    const chatMessages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt },
      ...messages.slice(-20), // Keep last 20 messages for context window
    ]

    const zai = await ZAI.create()

    const response = await zai.chat.completions.create({
      messages: chatMessages,
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Save messages to chat history
    const lastUserMsg = messages[messages.length - 1]
    if (lastUserMsg && lastUserMsg.role === 'user') {
      await db.chatMessage.create({ data: { role: 'user', content: lastUserMsg.content } })
    }
    await db.chatMessage.create({ data: { role: 'assistant', content } })

    // Keep only last 50 messages in history
    const totalMessages = await db.chatMessage.count()
    if (totalMessages > 50) {
      const oldestMessages = await db.chatMessage.findMany({
        orderBy: { createdAt: 'asc' },
        take: totalMessages - 50,
        select: { id: true },
      })
      if (oldestMessages.length > 0) {
        await db.chatMessage.deleteMany({
          where: { id: { in: oldestMessages.map((m) => m.id) } },
        })
      }
    }

    return NextResponse.json({ success: true, data: { message: content } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
