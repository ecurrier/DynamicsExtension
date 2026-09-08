import { useMemo } from 'react'

import { type FormPreset, formPresetsItem, useStorageItem, useStorageUpdate } from '@/shared/storage'
import { type PageContext } from '@/shared/types'

export const useFormPresets = (pageContext: PageContext | null) => {
  const query = useStorageItem(formPresetsItem)
  const update = useStorageUpdate(formPresetsItem)
  const byId = useMemo(() => (pageContext ? (query.data?.[pageContext] ?? {}) : {}), [pageContext, query.data])
  const presets = useMemo(() => Object.values(byId).sort((left, right) => left.name.localeCompare(right.name)), [byId])
  const upsert = (preset: FormPreset) => {
    if (!pageContext) {
      return Promise.reject(new Error('Form presets can only be saved on a model-driven app or Power Pages site'))
    }
    return update.mutateAsync((current) => ({
      ...current,
      [pageContext]: { ...current[pageContext], [preset.id]: preset },
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
  return { presets, byId, isLoading: query.isLoading, upsert, remove, isSaving: update.isPending }
}
