'use client'

import { motion } from 'framer-motion'
import { LayoutDashboard, ScanLine, BarChart3, Settings } from 'lucide-react'
import { useCalorieStore } from '@/store/calorie-store'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'track' as const, label: 'Track', icon: ScanLine },
  { id: 'history' as const, label: 'History', icon: BarChart3 },
  { id: 'settings' as const, label: 'Goals', icon: Settings },
]

export function BottomNav() {
  const { activeTab, setActiveTab } = useCalorieStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/50 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {tab.label}
              </span>
              {tab.id === 'track' && (
                <motion.div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/40'
                  )}
                  animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}