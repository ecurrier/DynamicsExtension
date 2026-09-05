import { Toaster } from '@fluentui/react-components'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren, useState } from 'react'

import { APP_TOASTER_ID, DialogProvider, ToastBridge } from '@/shared/components'
import { ThemeProvider } from '@/shared/theme'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  })

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DialogProvider>
          {children}
          <ToastBridge />
          <Toaster toasterId={APP_TOASTER_ID} position="top-end" pauseOnHover />
        </DialogProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
