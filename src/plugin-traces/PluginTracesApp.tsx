import { Spinner } from '@fluentui/react-components'

import { EmptyState } from '@/shared/components'

import { TraceViewer } from './TraceViewer'
import { useTraceViewerBootstrap } from './useTraceViewerBootstrap'

export const PluginTracesApp = () => {
  const status = useTraceViewerBootstrap()
  if (status.kind === 'loading') {
    return <Spinner label="Connecting to the Dynamics tab..." style={{ padding: '24px' }} />
  }
  if (status.kind === 'missing') {
    return (
      <EmptyState title="No Dynamics tab to read traces from">
        Open Power Tools on a model-driven app, then use Plugin Traces and choose Open Trace Viewer.
      </EmptyState>
    )
  }
  if (status.kind === 'lost') {
    return (
      <EmptyState title="The Dynamics tab is no longer available" intent="warning">
        {status.reason}. Open Power Tools on a Dynamics tab and launch the viewer again.
      </EmptyState>
    )
  }
  return <TraceViewer launch={status.launch} />
}
