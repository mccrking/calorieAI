'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Calendar, Download, Target, Flame } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StatDay { date: string; calories: number; protein: number; carbs: number; fat: number; count: number; meals?: Record<string, number> }

export function HistoryView() {
  const { goals, analytics, setAnalytics, analyticsRange, setAnalyticsRange, entries, selectedDate } = useCalorieStore()
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<StatDay[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [analyticsRes, statsRes] = await Promise.all([
          fetch(`/api/analytics?range=${analyticsRange}`),
          fetch(`/api/stats?range=${analyticsRange}`),
        ])
        const [aData, sData] = await Promise.all([analyticsRes.json(), statsRes.json()])
        if (aData.success) {
          const d = aData.data
          setAnalytics({
            chartData: d.dailyData.map((day: any) => ({ ...day, count: day.entries })),
            streak: d.currentStreak,
            consistencyScore: d.consistencyScore,
            avgCalories: d.averages.calories,
            avgProtein: d.averages.protein,
            bestDay: d.bestDay,
            worstDay: d.worstDay,
            totalEntries: d.totalEntries,
          })
        }
        if (sData.success) setChartData(sData.data.chartData)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [analyticsRange, setAnalytics])

  const maxCalories = analytics ? Math.max(...chartData.map(d => d.calories), goals.calorieTarget, 1) : goals.calorieTarget

  // Generate PDF report
  const generatePDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()
    const todayStr = format(new Date(), 'MMMM d, yyyy')

    doc.setFontSize(20)
    doc.setTextColor(22, 163, 74)
    doc.text('CalorieAI', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Weekly Nutrition Report — ${todayStr}`, 14, 28)

    if (analytics) {
      doc.setFontSize(11)
      doc.setTextColor(40)
      doc.text('Summary', 14, 40)
      doc.setFontSize(9)
      doc.text(`Average Daily Calories: ${analytics.avgCalories}`, 14, 47)
      doc.text(`Average Daily Protein: ${analytics.avgProtein}g`, 14, 53)
      doc.text(`Current Streak: ${analytics.streak} days`, 14, 59)
      doc.text(`Consistency Score: ${analytics.consistencyScore}%`, 14, 65)
      doc.text(`Goal: ${goals.calorieTarget} kcal/day`, 14, 71)
    }

    if (chartData.length > 0) {
      const tableData = chartData.map(d => [format(new Date(d.date + 'T00:00:00'), 'MMM d'), `${d.calories}`, `${Math.round(d.protein)}g`, `${Math.round(d.carbs)}g`, `${Math.round(d.fat)}g`, `${d.count}`])
      autoTable(doc, {
        startY: 80, head: [['Date', 'Calories', 'Protein', 'Carbs', 'Fat', 'Entries']],
        body: tableData,
        theme: 'striped', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 9 },
      })
    }

    doc.save(`CalorieAI-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  if (loading) {
    return <div className="px-4 pb-4 animate-fade-in-up"><div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 rounded-xl shimmer" />)}</div></div>
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Header + PDF export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold">Analytics</h2></div>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={generatePDF}>
          <Download className="w-3 h-3" /> PDF Report
        </Button>
      </div>

      {/* Range Toggle */}
      <div className="flex gap-2">
        {[
          { label: '7 Days', value: 7 },
          { label: '30 Days', value: 30 },
        ].map(r => (
          <button key={r.value} onClick={() => setAnalyticsRange(r.value)}
            className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all border', analyticsRange === r.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50 text-muted-foreground hover:text-foreground')}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-primary" /></div>
            <div><p className="text-base font-bold">{analytics.avgCalories}</p><p className="text-[10px] text-muted-foreground">Avg. calories/day</p></div>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-base font-bold">{analytics.avgProtein}g</p><p className="text-[10px] text-muted-foreground">Avg. protein/day</p></div>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center"><Flame className="w-4 h-4 text-orange-500" /></div>
            <div><p className="text-base font-bold">{analytics.streak} days</p><p className="text-[10px] text-muted-foreground">Current streak</p></div>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center"><Target className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
            <div><p className="text-base font-bold">{analytics.consistencyScore}%</p><p className="text-[10px] text-muted-foreground">Consistency</p></div>
          </CardContent></Card>
        </div>
      )}

      {/* Bar Chart */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground">Daily Calories</p>
            <div className="flex items-center gap-1"><div className="w-6 h-0.5 bg-primary rounded" /><span className="text-[10px] text-muted-foreground">Target: {goals.calorieTarget}</span></div>
          </div>
          <div className="flex items-end gap-[3px] h-28">
            {chartData.map((day, i) => {
              const height = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0
              const isOver = day.calories > goals.calorieTarget
              const isToday = day.date === format(new Date(), 'yyyy-MM-dd')
              const showLabel = analyticsRange <= 7 || i % 5 === 0 || isToday
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div className="w-full rounded-t-sm min-h-[3px] relative group" initial={{ height: 0 }} animate={{ height: `${Math.max(height, 3)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
                    style={{ background: isOver ? 'linear-gradient(to top, #ef4444, #f87171)' : 'linear-gradient(to top, #16a34a, #4ade80)' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {day.calories} kcal
                    </div>
                  </motion.div>
                  {showLabel && <span className={cn('text-[8px]', isToday ? 'font-bold text-primary' : 'text-muted-foreground')}>{format(new Date(day.date + 'T00:00:00'), analyticsRange <= 7 ? 'EEE' : 'd')}</span>}
                </div>
              )
            })}
          </div>
          {/* Target line */}
          <div className="border-t-2 border-dashed border-primary/30 -mt-[calc(50%-4px)]" style={{ marginTop: `${-((goals.calorieTarget / maxCalories) * 112 + 8)}px` }} />
        </CardContent>
      </Card>

      {/* Best/Worst Days */}
      {analytics && analytics.bestDay && analytics.worstDay && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-1">🏆 Best Day</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{analytics.bestDay.calories}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(analytics.bestDay.date + 'T00:00:00'), 'MMM d')}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200/50 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mb-1">📉 Need Work</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{analytics.worstDay.calories}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(analytics.worstDay.date + 'T00:00:00'), 'MMM d')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Breakdown */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily Breakdown</h3>
          {chartData.slice().reverse().map((day, i) => {
            const progress = Math.min((day.calories / goals.calorieTarget) * 100, 100)
            const isOver = day.calories > goals.calorieTarget
            return (
              <motion.div key={day.date} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 py-1.5">
                <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0">{format(new Date(day.date + 'T00:00:00'), 'MMM d')}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div className={cn('h-full rounded-full', isOver ? 'bg-destructive' : 'bg-primary')} initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className={cn('text-[11px] font-medium w-14 text-right tabular-nums', isOver && 'text-destructive')}>{day.calories} kcal</span>
                <span className="text-[10px] text-muted-foreground w-6 text-right">{day.count}x</span>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}