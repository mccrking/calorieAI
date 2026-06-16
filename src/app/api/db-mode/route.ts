import { NextResponse } from 'next/server'
import { getDatabaseMode } from '@/lib/database'

export async function GET() {
  const mode = getDatabaseMode()
  return NextResponse.json({
    success: true,
    data: {
      mode,
      label: mode === 'supabase' ? 'Supabase (PostgreSQL)' : 'SQLite (Local)',
    },
  })
}