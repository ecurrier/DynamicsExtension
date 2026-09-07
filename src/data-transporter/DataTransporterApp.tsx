import { Spinner } from '@fluentui/react-components'

import { DataTransporter } from './DataTransporter'
import { useTransporterBootstrap } from './hooks'

export const DataTransporterApp = () => {
  const status = useTransporterBootstrap()
  if (status.kind === 'loading') {
    return <Spinner label="Connecting..." style={{ padding: '24px' }} />
  }
  return <DataTransporter launch={status.launch} pageAvailable={status.pageAvailable} />
}
