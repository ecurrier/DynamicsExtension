import { defineHandlers } from '@/messaging/page'
import { getXrm, pageHttp, runOperation } from '@/page/xrm'
import { transportOperations } from '@/shared/lib'

const MAX_PAGE_SIZE = 1000

const operations = () => {
  getXrm()
  return transportOperations(pageHttp())
}

export const transportHandlers = defineHandlers({
  'transport.listEntities': () => runOperation(() => operations().listEntities()),
  'transport.listViews': (request) => runOperation(() => operations().listViews(request)),
  'transport.getEntityMetadata': (request) => runOperation(() => operations().getEntityMetadata(request)),
  'transport.retrievePage': (request) =>
    runOperation(() =>
      operations().retrievePage({ ...request, pageSize: Math.min(Math.max(1, request.pageSize), MAX_PAGE_SIZE) }),
    ),
})
