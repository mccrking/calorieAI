'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalorieRing } from './calorie-ring'
import { EntryCard } from './entry-card'
import { useCalorieStore } from '@/store/calorie-store'
import { format, addDays, subDays, isToday } from 'date-fns'
import { useMemo } from 'react'
import { UtensilsCrossed, Flame, Target, TrendingUp } from 'lucide-react'

export function DashboardView() {
  const {
    entries,
    goals,
    selectedDate,
    setSelectedDate,
    removeEntry,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    calorieProgress,
  } = useCalorieStore()

  const consumed = totalCalories()
  const protein = totalProtein()
  const carbs = totalCarbs()
  const fat = totalFat()

  const macroData = useMemo(() => [
    { label: 'Protein', value: protein, target: goals.proteinTarget, unit: 'g', color: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950' },
    { label: 'Carbs', value: carbs, target: goals.carbTarget, unit: 'g', color: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950' },
    { label: 'Fat', value: fat, target: goals.fatTarget, unit: 'g', color: 'bg-rose-500', bg: 'bg-rose-100 dark:bg-rose-950' },
  ], [protein, carbs, fat, goals])

  const mealGroups = useMemo(() => {
    const groups: Record<string, typeof entries> = { breakfast: [], lunch: [], dinner: [], snack: [] }
    entries.forEach((e) => {
      if (groups[e.mealType]) groups[e.mealType].push(e)
    })
    return groups
  }, [entries])

  const dateObj = new Date(selectedDate + 'T00:00:00')
  const dateLabel = isToday(dateObj) ? 'Today' : format(dateObj, 'EEE, MMM d')

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      {/* Date Selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSelectedDate(format(subDays(dateObj, 1), 'yyyy-MM-dd'))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <button
          onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          {dateLabel}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSelectedDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calorie Ring */}
      <div className="flex justify-center py-2">
        <CalorieRing
          progress={calorieProgress()}
          consumed={consumed}
          target={goals.calorieTarget}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <Flame className="w-4 h-4 mx-auto text-rose-500 mb-1" />
          <p className="text-base font-bold">{consumed}</p>
          <p className="text-[10px] text-muted-foreground">Eaten</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <Target className="w-4 h-4 mx-auto text-primary mb-1" />
          <p className="text-base font-bold">{Math.max(0, goals.calorieTarget - consumed)}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="bg-card rounded-xl p-3 text-center border border-border/50">
          <TrendingUp className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <p className="text-base font-bold">{entries.length}</p>
          <p className="text-[10px] text-muted-foreground">Entries</p>
        </div>
      </div>

      {/* Macros */}
      <div className="bg-card rounded-xl p-4 border border-border/50 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Macros</h3>
        {macroData.map((macro) => (
          <div key={macro.label} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium">{macro.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round(macro.value)} / {macro.target}{macro.unit}
              </span>
            </div>
            <div className={`h-2 rounded-full ${macro.bg}`}>
              <motion.div
                className={`h-full rounded-full ${macro.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((macro.value / macro.target) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Meal Sections */}
      {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => {
        const items = mealGroups[meal]
        if (items.length === 0) return null
        return (
          <div key={meal} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {meal.charAt(0).toUpperCase() + meal.slice(1)}
              </h3>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {items.reduce((s, e) => s + e.calories, 0)} kcal
              </span>
            </div>
            <div className="space-y-2">
              {items.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onDelete={removeEntry}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium">No meals logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap &quot;Track&quot; to add your first meal
          </p>
        </motion.div>
      )}
    </div>
  )
}