import { EmptyState } from '@/shared/components'
import { resultsShareItem, useStorageItem } from '@/shared/storage'

import { ResultsViewer } from './ResultsViewer'

export const ResultsViewerApp = () => {
  const share = useStorageItem(resultsShareItem)
  if (share.isLoading) {
    return null
  }
  if (!share.data) {
    return (
      <EmptyState title="No results to show">
        Run a Fetch XML query from the Power Tools popup, then open the viewer.
      </EmptyState>
    )
  }
  return <ResultsViewer share={share.data} />
}
