import { type CSSProperties, useLayoutEffect, useState } from 'react'

const GAP = 4
const MIN_HEIGHT = 160

export const useAnchoredPanel = (anchor: HTMLElement | null, open: boolean, preferredHeight = 320): CSSProperties => {
  const [style, setStyle] = useState<CSSProperties>({})
  useLayoutEffect(() => {
    if (!open || !anchor) {
      return
    }
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - GAP
      const above = rect.top - GAP
      const flip = below < Math.min(preferredHeight, MIN_HEIGHT) && above > below
      const maxHeight = Math.max(MIN_HEIGHT, Math.min(preferredHeight, (flip ? above : below) - GAP))
      setStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        maxHeight,
        ...(flip ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchor, open, preferredHeight])
  return style
}
