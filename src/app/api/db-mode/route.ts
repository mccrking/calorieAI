import { NextResponse } from 'next/server'
import { getDatabaseMode } from '@/lib/database'
import { getAIProvider } from '@/lib/ai'

export async function GET() {
  const dbMode = getDatabaseMode()
  const aiProvider = getAIProvider()

  return NextResponse.json({
    success: true,
    data: {
      database: {
        mode: dbMode,
        label: dbMode === 'supabase' ? 'Supabase (PostgreSQL)' : 'SQLite (Local)',
      },
      ai: {
        provider: aiProvider,
        label: aiProvider === 'openai' ? `OpenAI (GPT-4o-mini)` : 'Built-in AI (z-ai-sdk)',
      },
    },
  })
}