import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App, AppProviders } from '@/app'
import { readPopupLaunch } from '@/shared/extension'
import { runStorageMigrations } from '@/shared/storage'

import '@/app/popup.css'

const start = async () => {
  if (readPopupLaunch().mode === 'window') {
    document.documentElement.dataset.mode = 'window'
  }
  await runStorageMigrations().catch(() => undefined)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
}

void start()
