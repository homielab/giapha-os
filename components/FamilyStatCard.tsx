'use client'

import { m } from 'framer-motion'

interface StatCardProps {
  label: string
  value: number
  total: number
  icon: React.ReactNode
  color: string
  delay?: number
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
  delay = 0
}: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className='group relative overflow-hidden rounded-3xl border border-stone-200/60 bg-white/80 p-5 transition-colors hover:-translate-y-1'>
      {/* Background glow */}
      <div
        className={`absolute -top-6 -right-6 size-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30 ${color}`}
      />

      <div className='relative z-10 mb-3 flex items-start justify-between'>
        <div className={`rounded-xl p-2.5 ${color} bg-opacity-10`}>{icon}</div>
        <span className='rounded-full bg-stone-100 px-2 py-1 text-sm font-medium text-stone-600'>
          {pct}%
        </span>
      </div>

      <p className='relative z-10 text-sm font-medium text-stone-800'>
        {value}
      </p>
      <p className='relative z-10 mt-0.5 text-sm font-medium text-stone-500'>
        {label}
      </p>

      {/* Progress bar */}
      <div className='relative z-10 mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100'>
        <m.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: delay + 0.2, ease: 'easeOut' }}
          style={{ width: `${pct}%` }}
          className={`h-full origin-left rounded-full ${color}`}
        />
      </div>
    </m.div>
  )
}

// Generation breakdown row

export default StatCard
