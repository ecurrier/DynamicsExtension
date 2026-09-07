import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

export const useSystemTheme = (): ThemeMode => {
  const [mode, setMode] = useState<ThemeMode>(() => (query().matches ? 'dark' : 'light'))
  useEffect(() => {
    const media = query()
    const listener = (event: MediaQueryListEvent) => setMode(event.matches ? 'dark' : 'light')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  return mode
}
