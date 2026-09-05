import { useMemo } from 'react'

import { type Template, templatesItem, useStorageItem, useStorageUpdate } from '@/shared/storage'
import { type PageContext } from '@/shared/types'

export const useTemplates = (pageContext: PageContext | null) => {
  const query = useStorageItem(templatesItem)
  const update = useStorageUpdate(templatesItem)
  const byId = useMemo(() => (pageContext ? (query.data?.[pageContext] ?? {}) : {}), [pageContext, query.data])
  const templates = useMemo(
    () => Object.values(byId).sort((left, right) => left.name.localeCompare(right.name)),
    [byId],
  )
  const upsert = (template: Template) => {
    if (!pageContext) {
      return Promise.reject(new Error('Templates can only be saved on a model-driven app or Power Pages site'))
    }
    return update.mutateAsync((current) => ({
      ...current,
      [pageContext]: { ...current[pageContext], [template.id]: template },
    }))
  }
  const remove = (id: string) => {
    if (!pageContext) {
      return Promise.reject(new Error('No page context'))
    }
    return update.mutateAsync((current) => {
      const next = { ...current[pageContext] }
      delete next[id]
      return { ...current, [pageContext]: next }
    })
  }
  return { templates, byId, isLoading: query.isLoading, upsert, remove, isSaving: update.isPending }
}
