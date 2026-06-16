'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, Target, TrendingUp, Droplets, Trophy, Award, Zap, ChevronRight as ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalorieRing } from './calorie-ring'
import { EntryCard } from './entry-card'
import { useCalorieStore } from '@/store/calorie-store'
import { format, addDays, subDays, isToday } from 'date-fns'
import { Progress } from '@/components/ui/progress'

export function DashboardView() {
  const {
    entries, goals, selectedDate, setSelectedDate, removeEntry,
    totalCalories, totalProtein, totalCarbs, totalFat, calorieProgress,
    water, addWater, analytics, setAnalytics, analyticsRange, badges,
  } = useCalorieStore()

  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const consumed = totalCalories()
  const protein = totalProtein()
  const carbs = totalCarbs()
  const fat = totalFat()

  useEffect(() => {
    async function load() {
      setLoadingAnalytics(true)
      try {
        const res = await fetch(`/api/analytics?range=${analyticsRange}`)
        const data = await res.json()
        if (data.success) {
          const d = data.data
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
      } catch { /* silent */ }
      finally { setLoadingAnalytics(false) }
    }
    load()
  }, [analyticsRange, setAnalytics])

  useEffect(() => {
    async function loadWater() {
      try {
        const res = await fetch(`/api/water?date=${selectedDate}`)
        const data = await res.json()
        if (data.success) {
          const store = useCalorieStore.getState()
          store.setWater({ ...store.water, totalGlasses: data.data.totalGlasses || 0 })
        }
      } catch { /* silent */ }
    }
    loadWater()
  }, [selectedDate])

  const macroData = useMemo(() => [
    { label: 'Protein', value: protein, target: goals.proteinTarget, unit: 'g', color: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950' },
    { label: 'Carbs', value: carbs, target: goals.carbTarget, unit: 'g', color: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950' },
    { label: 'Fat', value: fat, target: goals.fatTarget, unit: 'g', color: 'bg-rose-500', bg: 'bg-rose-100 dark:bg-rose-950' },
  ], [protein, carbs, fat, goals])

  const mealGroups = useMemo(() => {
    const groups: Record<string, typeof entries> = { breakfast: [], lunch: [], dinner: [], snack: [] }
    entries.forEach((e) => { if (groups[e.mealType]) groups[e.mealType].push(e) })
    return groups
  }, [entries])

  const unlockedBadges = badges.filter(b => b.unlockedAt)

  const dateObj = new Date(selectedDate + 'T00:00:00')
  const dateLabel = isToday(dateObj) ? 'Today' : format(dateObj, 'EEE, MMM d')

  const dailyScore = useMemo(() => {
    if (!analytics) return 0
    let score = 0
    if (consumed > 0 && consumed <= goals.calorieTarget * 1.1) score += 40
    else if (consumed > 0) score += 20
    if (protein >= goals.proteinTarget * 0.8) score += 20
    if (water.totalGlasses >= water.goalGlasses * 0.8) score += 20
    if (entries.length >= 3) score += 20
    return Math.min(score, 100)
  }, [consumed, protein, water, entries, goals, analytics])

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Date Selector + Streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(format(subDays(dateObj, 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))} className="text-sm font-semibold hover:text-primary transition-colors">
            {dateLabel}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {analytics && analytics.streak > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{analytics.streak} day{analytics.streak > 1 ? 's' : ''}</span>
          </motion.div>
        )}
      </div>

      {/* Streak + Consistency Banner */}
      {analytics && analytics.streak >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-200/50 dark:border-orange-800/30 rounded-xl p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🔥</div>
              <div>
                <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{analytics.streak} Day Streak!</p>
                <p className="text-[10px] text-muted-foreground">Keep it going, you&apos;re on fire!</p>
              </div>
            </div>
            {analytics.consistencyScore > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{analytics.consistencyScore}%</p>
                <p className="text-[9px] text-muted-foreground">consistency</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Calorie Ring */}
      <div className="flex justify-center py-1">
        <CalorieRing progress={calorieProgress()} consumed={consumed} target={goals.calorieTarget} />
      </div>

      {/* Quick Stats + Daily Score */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-card rounded-xl p-2.5 text-center border border-border/50">
          <Flame className="w-3.5 h-3.5 mx-auto text-rose-500 mb-0.5" />
          <p className="text-sm font-bold">{consumed}</p>
          <p className="text-[9px] text-muted-foreground">Eaten</p>
        </div>
        <div className="bg-card rounded-xl p-2.5 text-center border border-border/50">
          <Target className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
          <p className="text-sm font-bold">{Math.max(0, goals.calorieTarget - consumed)}</p>
          <p className="text-[9px] text-muted-foreground">Left</p>
        </div>
        <div className="bg-card rounded-xl p-2.5 text-center border border-border/50">
          <TrendingUp className="w-3.5 h-3.5 mx-auto text-amber-500 mb-0.5" />
          <p className="text-sm font-bold">{entries.length}</p>
          <p className="text-[9px] text-muted-foreground">Entries</p>
        </div>
        <div className="bg-card rounded-xl p-2.5 text-center border border-border/50">
          <Zap className="w-3.5 h-3.5 mx-auto text-violet-500 mb-0.5" />
          <p className="text-sm font-bold">{dailyScore}</p>
          <p className="text-[9px] text-muted-foreground">Score</p>
        </div>
      </div>

      {/* Water Tracker */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-semibold">Hydration</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">{water.totalGlasses}/{water.goalGlasses} glasses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((water.totalGlasses / water.goalGlasses) * 100, 100)}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
              onClick={async () => {
                const newTotal = water.totalGlasses + 1
                addWater(1)
                try { await fetch('/api/water', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 250, date: selectedDate }) }) } catch { /* silent */ }
              }}
            >
              <span className="text-lg leading-none">+</span>
            </Button>
          </div>
          <div className="flex justify-between mt-1.5">
            {Array.from({ length: water.goalGlasses }).map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < water.totalGlasses ? 'bg-blue-500' : 'bg-blue-100 dark:bg-blue-950'}`} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Macros */}
      <div className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Macros</h3>
          {consumed > 0 && (
            <div className="flex gap-1">
              {[
                { pct: Math.round((protein * 4 / consumed) * 100), color: 'bg-emerald-500' },
                { pct: Math.round((carbs * 4 / consumed) * 100), color: 'bg-amber-500' },
                { pct: Math.round((fat * 9 / consumed) * 100), color: 'bg-rose-500' },
              ].map((m, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${m.color}`} title={`${m.pct}%`} />
              ))}
            </div>
          )}
        </div>
        {macroData.map((macro) => (
          <div key={macro.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{macro.label}</span>
              <span className="text-muted-foreground tabular-nums">{Math.round(macro.value)} / {macro.target}{macro.unit}</span>
            </div>
            <div className={`h-2 rounded-full ${macro.bg}`}>
              <motion.div className={`h-full rounded-full ${macro.color}`} initial={{ width: 0 }} animate={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {unlockedBadges.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badges</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {unlockedBadges.map((badge) => (
              <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1 w-14 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <span className="text-lg">{badge.icon}</span>
                <span className="text-[9px] text-center font-medium leading-tight">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meal Sections */}
      {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => {
        const items = mealGroups[meal]
        if (items.length === 0) return null
        return (
          <div key={meal} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{meal.charAt(0).toUpperCase() + meal.slice(1)}</h3>
              <span className="text-[11px] text-muted-foreground tabular-nums">{items.reduce((s, e) => s + e.calories, 0)} kcal</span>
            </div>
            <div className="space-y-2">
              {items.map((entry, i) => <EntryCard key={entry.id} entry={entry} index={i} onDelete={removeEntry} />)}
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {entries.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium">Start your journey today!</p>
          <p className="text-xs text-muted-foreground mt-1">Log your first meal to begin tracking</p>
        </motion.div>
      )}
    </div>
  )
}