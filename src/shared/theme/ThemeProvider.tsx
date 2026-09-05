import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { type PropsWithChildren } from 'react'

import { useSystemTheme } from './useSystemTheme'

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const mode = useSystemTheme()
  return (
    <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme} style={{ height: '100%' }}>
      {children}
    </FluentProvider>
  )
}
