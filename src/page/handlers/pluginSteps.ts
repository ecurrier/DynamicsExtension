import { defineHandlers } from '@/messaging/page'
import { pageHttp, requireModelDrivenApp, runOperation } from '@/page/xrm'
import { pluginStepOperations } from '@/shared/lib'

const operations = () => {
  requireModelDrivenApp()
  return pluginStepOperations(pageHttp())
}

export const pluginStepsHandlers = defineHandlers({
  'pluginSteps.getSteps': () => runOperation(() => operations().getSteps()),
  'pluginSteps.get': (request) => runOperation(() => operations().get(request)),
  'pluginSteps.setState': (change) => runOperation(() => operations().setState(change)),
})
