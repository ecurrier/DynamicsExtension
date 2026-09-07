import { defineHandlers } from '@/messaging/page'
import { pageHttp, requireModelDrivenApp, runOperation } from '@/page/xrm'
import { environmentVariableOperations } from '@/shared/lib'

const operations = () => {
  requireModelDrivenApp()
  return environmentVariableOperations(pageHttp())
}

export const environmentVariablesHandlers = defineHandlers({
  'environmentVariables.getDefinitions': () => runOperation(() => operations().getDefinitions()),
  'environmentVariables.setValue': (request) => runOperation(() => operations().setValue(request)),
  'environmentVariables.clearValue': (request) => runOperation(() => operations().clearValue(request)),
})
