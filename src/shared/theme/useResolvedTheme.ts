import { createContext, useContext } from 'react'

import { type ThemeMode, useSystemTheme } from './useSystemTheme'

export const ThemeModeContext = createContext<ThemeMode | null>(null)

export const useResolvedTheme = (): ThemeMode => {
  const provided = useContext(ThemeModeContext)
  const system = useSystemTheme()
  return provided ?? system
}
