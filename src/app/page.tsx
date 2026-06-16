'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Leaf } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { useToast } from '@/hooks/use-toast'
import { DashboardView } from '@/components/app/dashboard-view'
import { TrackView } from '@/components/app/track-view'
import { HistoryView } from '@/components/app/history-view'
import { SettingsView } from '@/components/app/settings-view'
import { BottomNav } from '@/components/app/bottom-nav'
import { ChatView } from '@/components/app/chat-view'
import { MealPlanView } from '@/components/app/meal-plan-view'
import { ProfileView } from '@/components/app/profile-view'

const pageVariants = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }

export default function HomePage() {
  const { activeTab, selectedDate, setEntries, setGoals, removeEntry, entries, setBadges, setWater, goals, setLastReminder, lastReminder, water } = useCalorieStore()
  const { toast } = useToast()

  // Load data on mount and date change
  useEffect(() => {
    async function load() {
      try {
        const [entriesRes, goalsRes, badgesRes, waterRes] = await Promise.all([
          fetch(`/api/entries?date=${selectedDate}`),
          fetch(`/api/goals?date=${selectedDate}`),
          fetch('/api/badges'),
          fetch(`/api/water?date=${selectedDate}`),
        ])
        const [eData, gData, bData, wData] = await Promise.all([entriesRes.json(), goalsRes.json(), badgesRes.json(), waterRes.json()])
        if (eData.success) setEntries(eData.data)
        if (gData.success) setGoals({ date: gData.data.date, calorieTarget: gData.data.calorieTarget, proteinTarget: gData.data.proteinTarget, carbTarget: gData.data.carbTarget, fatTarget: gData.data.fatTarget })
        if (bData.success) setBadges(bData.data.badges || bData.data)
        if (wData.success) setWater({ totalGlasses: wData.data.glassCount ?? wData.data.totalGlasses ?? 0, goalGlasses: water.goalGlasses })
      } catch { /* silent */ }
    }
    load()
  }, [selectedDate, setEntries, setGoals, setBadges, setWater, water.goalGlasses])

  // Smart reminders
  useEffect(() => {
    if (lastReminder) return
    const check = () => {
      const hour = new Date().getHours()
      const hasMealType = (type: string) => entries.some(e => e.mealType === type)
      if (hour >= 14 && !hasMealType('lunch')) {
        setLastReminder('lunch')
        toast({ title: '⏰ Don\'t forget lunch!', description: 'You haven\'t logged your lunch yet today.' })
      } else if (hour >= 20 && !hasMealType('dinner')) {
        setLastReminder('dinner')
        toast({ title: '⏰ Dinner time?', description: 'No dinner logged yet. Tap Track to add it!' })
      }
    }
    const t = setTimeout(check, 5000)
    return () => clearTimeout(t)
  }, [entries, lastReminder, setLastReminder, toast])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { removeEntry(id); toast({ title: 'Removed', description: 'Entry deleted' }) }
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }) }
  }

  const totalCals = entries.reduce((s, e) => s + e.calories, 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Smart Food Tracker</p>
              </div>
            </div>
            {activeTab === 'dashboard' && entries.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <span className="text-xs font-bold text-primary tabular-nums">{totalCals.toLocaleString()}</span>
                <span className="text-[10px] text-primary/70">kcal</span>
              </motion.div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pt-4 pb-20 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit"><DashboardView /></motion.div>}
            {activeTab === 'track' && <motion.div key="track" variants={pageVariants} initial="initial" animate="animate" exit="exit"><TrackView /></motion.div>}
            {activeTab === 'history' && <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit"><HistoryView /></motion.div>}
            {activeTab === 'settings' && <motion.div key="settings" variants={pageVariants} initial="initial" animate="animate" exit="exit"><SettingsView /></motion.div>}
            {activeTab === 'chat' && <motion.div key="chat" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ChatView /></motion.div>}
            {activeTab === 'mealplan' && <motion.div key="mealplan" variants={pageVariants} initial="initial" animate="animate" exit="exit"><MealPlanView /></motion.div>}
            {activeTab === 'profile' && <motion.div key="profile" variants={pageVariants} initial="initial" animate="animate" exit="exit"><ProfileView /></motion.div>}
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}