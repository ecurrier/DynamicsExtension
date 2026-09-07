import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { type PropsWithChildren } from 'react'

import { useSystemTheme } from './useSystemTheme'
import { useThemePreference } from './useThemePreference'

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemMode = useSystemTheme()
  const preference = useThemePreference()
  const mode = preference === 'system' ? systemMode : preference
  return (
    <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme} style={{ height: '100%' }}>
      {children}
    </FluentProvider>
  )
}
