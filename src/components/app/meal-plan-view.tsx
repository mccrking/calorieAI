'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { UtensilsCrossed, Loader2, Sparkles, ChefHat, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCalorieStore } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const mealEmojis: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }

export function MealPlanView() {
  const { mealPlan, setMealPlan, isGeneratingPlan, setIsGeneratingPlan, goals, profile } = useCalorieStore()
  const { toast } = useToast()
  const [goalType, setGoalType] = useState<'lose' | 'maintain' | 'gain'>('maintain')
  const [preference, setPreference] = useState('balanced')

  const generatePlan = async () => {
    setIsGeneratingPlan(true)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: { calories: goals.calorieTarget, protein: goals.proteinTarget, carbs: goals.carbTarget, fat: goals.fatTarget },
          preference,
          goalType,
          days: 7,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const plan = data.data.plan || data.data
        const mapped = (Array.isArray(plan) ? plan : []).map((day: any) => ({
          day: day.dayLabel || `Day ${day.day}`,
          meals: Object.entries(day.meals || {}).map(([type, m]: [string, any]) => ({
            mealType: type,
            name: m.name,
            description: m.description || '',
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
          })),
        }))
        setMealPlan(mapped)
        toast({ title: 'Meal plan generated! 🎉', description: 'Your 7-day plan is ready' })
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to generate plan', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate meal plan', variant: 'destructive' })
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  return (
    <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <ChefHat className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">AI Meal Planner</h2>
      </div>

      {/* Generator Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs font-medium mb-2">Goal</p>
            <div className="grid grid-cols-3 gap-2">
              {([['lose', '🔥 Lose Weight'], ['maintain', '⚖️ Maintain'], ['gain', '💪 Gain Muscle']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setGoalType(val)}
                  className={cn('py-2 rounded-lg text-xs font-medium transition-all border', goalType === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/50')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-2">Diet Preference</p>
            <div className="flex flex-wrap gap-1.5">
              {['balanced', 'high-protein', 'low-carb', 'vegetarian', 'mediterranean', 'keto'].map(p => (
                <button key={p} onClick={() => setPreference(p)}
                  className={cn('text-[11px] px-2.5 py-1.5 rounded-full transition-all', preference === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary/10')}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generatePlan} disabled={isGeneratingPlan} className="w-full gap-2" size="lg">
            {isGeneratingPlan ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your plan...</> : <><Sparkles className="w-4 h-4" /> Generate 7-Day Meal Plan</>}
          </Button>
        </CardContent>
      </Card>

      {/* Meal Plan Results */}
      {mealPlan.length > 0 && (
        <div className="space-y-3">
          {mealPlan.map((day, dayIndex) => (
            <motion.div key={day.day} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIndex * 0.08 }}>
              <Card className="border-border/50 overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">{day.day}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {day.meals.reduce((s, m) => s + m.calories, 0)} kcal
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {day.meals.map((meal, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-base mt-0.5">{mealEmojis[meal.mealType] || '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{meal.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{meal.description}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400">{meal.protein}g P</span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400">{meal.carbs}g C</span>
                          <span className="text-[9px] text-rose-600 dark:text-rose-400">{meal.fat}g F</span>
                          <span className="text-[9px] text-muted-foreground">{meal.calories} kcal</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}