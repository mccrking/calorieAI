'use client'

import { motion } from 'framer-motion'
import { LayoutDashboard, ScanLine, BarChart3, Settings, MessageCircle, UtensilsCrossed, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

const mainTabs = [
  { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard },
  { id: 'track' as const, label: 'Track', icon: ScanLine },
  { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
]

const moreTabs = [
  { id: 'history' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'mealplan' as const, label: 'Meal Plan', icon: UtensilsCrossed },
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'settings' as const, label: 'Goals', icon: Settings },
]

export function BottomNav() {
  const { activeTab, setActiveTab } = useCalorieStore()
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const allTabs = [...mainTabs, ...moreTabs]
  const isMoreTab = moreTabs.some(t => t.id === activeTab)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center h-16 relative">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMore(false) }}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
                {isActive && <motion.div layoutId="nav-indicator" className="absolute -top-px left-4 right-4 h-0.5 bg-primary rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <Icon className={cn('w-5 h-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>{tab.label}</span>
              </button>
            )
          })}

          {/* More Button */}
          <button onClick={() => setShowMore(!showMore)} className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
            {isMoreTab && !showMore && <motion.div layoutId="nav-indicator" className="absolute -top-px left-4 right-4 h-0.5 bg-primary rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <motion.div animate={{ rotate: showMore ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(isMoreTab && !showMore ? 'text-primary' : 'text-muted-foreground')}>
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </motion.div>
            <span className={cn('text-[10px] font-medium', isMoreTab && !showMore ? 'text-primary' : 'text-muted-foreground')}>More</span>
          </button>
        </div>

        {/* More Menu */}
        {showMore && (
          <motion.div ref={moreRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 bg-card border border-border/50 border-b-0 rounded-t-2xl p-2 shadow-xl">
            <div className="grid grid-cols-4 gap-1">
              {moreTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMore(false) }}
                    className={cn('flex flex-col items-center gap-1 py-3 rounded-xl transition-all', isActive ? 'bg-primary/10' : 'hover:bg-muted/50')}>
                    <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  )
}