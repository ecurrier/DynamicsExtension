import { defineHandlers } from '@/messaging/page'
import { getXrm, pageHttp, runOperation } from '@/page/xrm'
import { environmentVariableOperations } from '@/shared/lib'

const operations = () => {
  getXrm()
  return environmentVariableOperations(pageHttp())
}

export const environmentVariablesHandlers = defineHandlers({
  'environmentVariables.getDefinitions': () => runOperation(() => operations().getDefinitions()),
  'environmentVariables.setValue': (request) => runOperation(() => operations().setValue(request)),
  'environmentVariables.clearValue': (request) => runOperation(() => operations().clearValue(request)),
})
