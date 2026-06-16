'use client'

import { motion } from 'framer-motion'

interface CalorieRingProps {
  progress: number
  consumed: number
  target: number
  size?: number
  strokeWidth?: number
}

export function CalorieRing({ progress, consumed, target, size = 200, strokeWidth = 14 }: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  const isOver = consumed > target
  const displayColor = isOver ? '#ef4444' : '#16a34a'
  const trackColor = isOver ? 'rgba(239, 68, 68, 0.12)' : 'rgba(22, 163, 74, 0.10)'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={displayColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold tracking-tight"
          style={{ color: displayColor }}
          key={consumed}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {consumed.toLocaleString()}
        </motion.span>
        <span className="text-xs text-muted-foreground mt-0.5">
          of {target.toLocaleString()} kcal
        </span>
        {isOver && (
          <motion.span
            className="text-[10px] font-medium text-destructive mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            +{(consumed - target).toLocaleString()} over
          </motion.span>
        )}
      </div>
    </div>
  )
}