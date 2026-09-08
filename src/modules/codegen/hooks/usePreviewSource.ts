import { usePageQuery } from '@/messaging/client'
import { type TemplateKind } from '@/shared/types'

import { type GenerationSource, localChoicesOf, SAMPLE_INDUSTRY, SAMPLE_TABLE } from '../lib'
import { useTableModel } from './useTableModel'

export interface PreviewSource {
  source: GenerationSource
  isSample: boolean
}

export const usePreviewSource = (kind: TemplateKind): PreviewSource => {
  const target = usePageQuery('utilities.getPageTarget', undefined)
  const model = useTableModel(target.data?.entityLogicalName ?? null)
  const table = model.data ?? null
  if (kind === 'table') {
    return table
      ? { source: { kind: 'table', table }, isSample: false }
      : { source: { kind: 'table', table: SAMPLE_TABLE }, isSample: true }
  }
  const local = table ? localChoicesOf(table)[0] : undefined
  return local
    ? { source: { kind: 'choice', choice: local }, isSample: false }
    : { source: { kind: 'choice', choice: SAMPLE_INDUSTRY }, isSample: true }
}
