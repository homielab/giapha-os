'use client'

import { LazyMotion } from 'framer-motion'
import { ReactNode } from 'react'

// ViewToggle uses `layoutId`, which needs the layout-projection features in
// domMax (domAnimation would silently skip the tab-pill animation). They are
// fetched after the first render instead of shipping with every page; until
// then `m` components render in their final state without animating.
const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
