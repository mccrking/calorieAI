'use client'

import { useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Leaf } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { DashboardView } from '@/components/app/dashboard-view'
import { TrackView } from '@/components/app/track-view'
import { HistoryView } from '@/components/app/history-view'
import { SettingsView } from '@/components/app/settings-view'
import { BottomNav } from '@/components/app/bottom-nav'
import Image from 'next/image'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function HomePage() {
  const {
    activeTab,
    selectedDate,
    setEntries,
    setGoals,
    removeEntry,
    entries,
  } = useCalorieStore()

  const { toast } = useToast()

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries?date=${selectedDate}`)
      const data = await res.json()
      if (data.success) {
        setEntries(data.data)
      }
    } catch {
      // silent
    }
  }, [selectedDate, setEntries])

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch(`/api/goals?date=${selectedDate}`)
      const data = await res.json()
      if (data.success) {
        setGoals({
          date: data.data.date,
          calorieTarget: data.data.calorieTarget,
          proteinTarget: data.data.proteinTarget,
          carbTarget: data.data.carbTarget,
          fatTarget: data.data.fatTarget,
        })
      }
    } catch {
      // silent
    }
  }, [selectedDate, setGoals])

  useEffect(() => {
    loadEntries()
    loadGoals()
  }, [loadEntries, loadGoals])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        removeEntry(id)
        toast({ title: 'Removed', description: 'Entry deleted' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Max width container for larger screens */}
      <div className="w-full max-w-lg mx-auto flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Leaf className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight leading-none">CalorieAI</h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  Smart Food Tracker
                </p>
              </div>
            </div>

            {/* Mini summary in header */}
            {activeTab === 'dashboard' && entries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full"
              >
                <span className="text-xs font-bold text-primary tabular-nums">
                  {entries.reduce((s, e) => s + e.calories, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-primary/70">kcal today</span>
              </motion.div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-4 pb-20 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <DashboardView />
              </motion.div>
            )}
            {activeTab === 'track' && (
              <motion.div key="track" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <TrackView />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <HistoryView />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <SettingsView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  )
}