'use client'

import { motion } from 'framer-motion'
import { Trash2, UtensilsCrossed, Coffee, Moon, Apple } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FoodItem } from '@/store/calorie-store'

const mealIcons: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="w-3.5 h-3.5" />,
  lunch: <UtensilsCrossed className="w-3.5 h-3.5" />,
  dinner: <Moon className="w-3.5 h-3.5" />,
  snack: <Apple className="w-3.5 h-3.5" />,
}

const mealColors: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  lunch: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  dinner: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  snack: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
}

interface EntryCardProps {
  entry: FoodItem
  index: number
  onDelete: (id: string) => void
}

export function EntryCard({ entry, index, onDelete }: EntryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Meal type icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${mealColors[entry.mealType] || mealColors.snack}`}>
        {mealIcons[entry.mealType] || mealIcons.snack}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{entry.name}</p>
          {entry.source === 'image' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              AI Photo
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {entry.serving && (
            <span className="text-[11px] text-muted-foreground">{entry.serving}</span>
          )}
          <span className="text-[11px] text-muted-foreground">
            P:{entry.protein}g · C:{entry.carbs}g · F:{entry.fat}g
          </span>
        </div>
      </div>

      {/* Calories & Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-bold tabular-nums">{entry.calories}</span>
        <span className="text-[10px] text-muted-foreground">kcal</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => entry.id && onDelete(entry.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}