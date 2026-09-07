import { PageError } from '@/messaging/page'

export type PageKind = 'form' | 'view' | 'none'

export const getXrm = (): Xrm.XrmStatic => {
  const xrm = window.Xrm
  if (!xrm) {
    throw new PageError('NotModelDrivenApp', 'Open a model-driven app before running this action')
  }
  return xrm
}

export const requireModelDrivenApp = (): void => {
  getXrm()
}

const getPage = (): Xrm.Page | null => (window.Xrm?.Page as Xrm.Page | undefined) ?? null

export const getPageKind = (): PageKind => {
  const page = getPage()
  if (!page) {
    return 'none'
  }
  return page.data?.entity ? 'form' : 'view'
}

export const getFormContext = (): Xrm.Page => {
  const page = getPage()
  if (!page?.data?.entity) {
    throw new PageError('NoFormContext', 'Navigate to a record form before running this action')
  }
  return page
}

export const getGlobalContext = (): Xrm.GlobalContext => getXrm().Utility.getGlobalContext()

export const getEntityId = (formContext: Xrm.Page): string =>
  formContext.data.entity.getId().replace(/[{}]/g, '').toLowerCase()
