import { create } from 'zustand'

import { type TemplateKind } from '@/shared/types'

export interface CodegenState {
  kind: TemplateKind
  tableLogicalName: string | null
  choiceName: string | null
  templateIds: Partial<Record<TemplateKind, string>>
  settingOverrides: Record<string, Record<string, string>>
  includeSystemColumns: boolean
  editingTemplateId: string | null
  setKind: (kind: TemplateKind) => void
  setTable: (tableLogicalName: string | null) => void
  setChoice: (choiceName: string | null) => void
  setTemplate: (kind: TemplateKind, templateId: string | null) => void
  setSetting: (templateId: string, key: string, value: string) => void
  setIncludeSystemColumns: (includeSystemColumns: boolean) => void
  setEditingTemplate: (editingTemplateId: string | null) => void
  launch: (kind: TemplateKind, tableLogicalName: string | null) => void
}

export const useCodegenStore = create<CodegenState>()((set) => ({
  kind: 'table',
  tableLogicalName: null,
  choiceName: null,
  templateIds: {},
  settingOverrides: {},
  includeSystemColumns: false,
  editingTemplateId: null,
  setKind: (kind) => set({ kind }),
  setTable: (tableLogicalName) => set({ tableLogicalName, choiceName: null }),
  setChoice: (choiceName) => set({ choiceName }),
  setTemplate: (kind, templateId) =>
    set((state) => ({ templateIds: { ...state.templateIds, [kind]: templateId ?? undefined } })),
  setSetting: (templateId, key, value) =>
    set((state) => ({
      settingOverrides: {
        ...state.settingOverrides,
        [templateId]: { ...state.settingOverrides[templateId], [key]: value },
      },
    })),
  setIncludeSystemColumns: (includeSystemColumns) => set({ includeSystemColumns }),
  setEditingTemplate: (editingTemplateId) => set({ editingTemplateId }),
  launch: (kind, tableLogicalName) => set({ kind, tableLogicalName, choiceName: null }),
}))
