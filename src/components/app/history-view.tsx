'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'

interface StatDay {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  count: number
}

export function HistoryView() {
  const { goals } = useCalorieStore()
  const [stats, setStats] = useState<{
    chartData: StatDay[]
    averages: { calories: number; protein: number }
    totalEntries: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/stats?range=7')
        const data = await res.json()
        if (data.success) setStats(data.data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  const maxCalories = stats
    ? Math.max(...stats.chartData.map((d) => d.calories), goals.calorieTarget)
    : goals.calorieTarget

  if (loading) {
    return (
      <div className="px-4 pb-4 animate-fade-in-up">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">Last 7 Days</h2>
      </div>

      {/* Chart */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          {/* Target line label */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground">Daily Calories</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-primary rounded" />
              <span className="text-[10px] text-muted-foreground">Target: {goals.calorieTarget}</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end gap-2 h-32">
            {stats?.chartData.map((day, i) => {
              const height = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0
              const isOver = day.calories > goals.calorieTarget
              const isToday = day.date === format(new Date(), 'yyyy-MM-dd')

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className="w-full rounded-t-md min-h-[4px] relative group"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 4)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                    style={{
                      background: isOver
                        ? 'linear-gradient(to top, #ef4444, #f87171)'
                        : 'linear-gradient(to top, #16a34a, #4ade80)',
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {day.calories} kcal
                    </div>
                  </motion.div>
                  <span className={`text-[9px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {format(new Date(day.date + 'T00:00:00'), 'EEE').charAt(0)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Target line */}
          <div
            className="border-t-2 border-dashed border-primary/40 -mt-[calc(50%-theme(spacing.1))]"
            style={{
              marginTop: `${-((goals.calorieTarget / maxCalories) * 128)}px`,
            }}
          />
        </CardContent>
      </Card>

      {/* Average Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.averages.calories}</p>
                <p className="text-[10px] text-muted-foreground">Avg. daily calories</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.averages.protein}g</p>
                <p className="text-[10px] text-muted-foreground">Avg. daily protein</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day by Day Breakdown */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Breakdown</h3>
          {stats?.chartData.map((day, i) => {
            const progress = Math.min((day.calories / goals.calorieTarget) * 100, 100)
            const isOver = day.calories > goals.calorieTarget

            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-1.5"
              >
                <span className="text-[11px] text-muted-foreground w-10 flex-shrink-0">
                  {format(new Date(day.date + 'T00:00:00'), 'MMM d')}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isOver ? 'bg-destructive' : 'bg-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                  />
                </div>
                <span className={`text-[11px] font-medium w-16 text-right tabular-nums ${isOver ? 'text-destructive' : ''}`}>
                  {day.calories} kcal
                </span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {day.count}x
                </span>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}