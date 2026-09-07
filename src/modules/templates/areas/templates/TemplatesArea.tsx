import {
  Dropdown,
  Field,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  Text,
} from '@fluentui/react-components'
import {
  ArrowDownload20Regular,
  ArrowUpload20Regular,
  Delete20Regular,
  DocumentAdd20Regular,
  Play20Regular,
  Save20Regular,
} from '@fluentui/react-icons'
import { useRef, useState } from 'react'

import { usePageMutation, usePageQuery } from '@/messaging/client'
import { AreaContainer, AreaToolbar, CodeEditor, FormStack, Grow, useAppToast, useConfirm } from '@/shared/components'
import { generateGuid } from '@/shared/lib'

import { useTemplates } from '../../hooks'
import { exportFileName, formatFields, parseFields, parseTemplateFile, serializeTemplate } from '../../lib'

const NEW_TEMPLATE = '__new__'

interface Draft {
  name: string
  json: string
}

export const TemplatesArea = () => {
  const toast = useAppToast()
  const confirm = useConfirm()
  const pageContext = usePageQuery('global.getPageContext', undefined)
  const context = pageContext.data ?? null
  const { templates, byId, upsert, remove, isSaving } = useTemplates(context)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const capture = usePageMutation('templates.captureFormValues', {
    onSuccess: (fields) => {
      setSelectedId(NEW_TEMPLATE)
      setDraft({ name: '', json: formatFields(fields) })
      setJsonError(null)
    },
  })
  const apply = usePageMutation('templates.applyFormValues', {
    onSuccess: (result) =>
      result.skipped.length > 0
        ? toast.info(
            `Applied ${result.applied} field${result.applied === 1 ? '' : 's'}`,
            `Skipped: ${result.skipped.join(', ')}`,
          )
        : toast.success(`Applied ${result.applied} field${result.applied === 1 ? '' : 's'}`),
  })

  const select = (id: string) => {
    const template = byId[id]
    setSelectedId(id)
    setDraft(template ? { name: template.name, json: formatFields(template.fields) } : null)
    setJsonError(null)
  }

  const readFields = (): Record<string, unknown> | null => {
    if (!draft) {
      return null
    }
    try {
      const fields = parseFields(draft.json)
      setJsonError(null)
      return fields
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
      return null
    }
  }

  const onApply = () => {
    const fields = readFields()
    if (!fields || Object.keys(fields).length === 0) {
      toast.error('No template fields to apply')
      return
    }
    apply.mutate({ fields })
  }

  const onSave = async () => {
    if (!draft) {
      toast.error('Generate or select a template first')
      return
    }
    if (!draft.name.trim()) {
      toast.error('Enter a template name')
      return
    }
    const fields = readFields()
    if (!fields) {
      return
    }
    const id = selectedId && selectedId !== NEW_TEMPLATE ? selectedId : generateGuid()
    try {
      await upsert({ id, name: draft.name.trim(), fields })
      setSelectedId(id)
      toast.success(`Saved template ${draft.name.trim()}`)
    } catch (error) {
      toast.error('Could not save the template', error)
    }
  }

  const onDelete = async () => {
    const template = selectedId ? byId[selectedId] : undefined
    if (!template) {
      toast.error('Select a saved template to delete')
      return
    }
    if (!(await confirm({ content: `Delete the template "${template.name}"?`, confirmLabel: 'Delete' }))) {
      return
    }
    try {
      await remove(template.id)
      setSelectedId(null)
      setDraft(null)
      toast.success('Template deleted')
    } catch (error) {
      toast.error('Could not delete the template', error)
    }
  }

  const onExport = () => {
    const fields = readFields()
    if (!draft || !fields || Object.keys(fields).length === 0) {
      toast.error('No template to export')
      return
    }
    const blob = new Blob([serializeTemplate({ name: draft.name, fields })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = exportFileName(draft.name)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File | undefined) => {
    if (!file) {
      return
    }
    try {
      const template = parseTemplateFile(await file.text())
      setSelectedId(NEW_TEMPLATE)
      setDraft({ name: template.name, json: formatFields(template.fields) })
      setJsonError(null)
    } catch (error) {
      toast.error('Could not import the template', error)
    }
  }

  const selectedLabel = selectedId === NEW_TEMPLATE ? 'New template' : (selectedId && byId[selectedId]?.name) || ''

  return (
    <AreaContainer>
      <AreaToolbar>
        <Grow>
          <Dropdown
            placeholder={
              context ? 'Select a template...' : 'Templates are available on model-driven apps and Power Pages'
            }
            value={selectedLabel}
            selectedOptions={selectedId ? [selectedId] : []}
            disabled={!context}
            onOptionSelect={(_, data) => data.optionValue && select(data.optionValue)}
          >
            {selectedId === NEW_TEMPLATE ? (
              <Option value={NEW_TEMPLATE} text="New template">
                New template
              </Option>
            ) : null}
            {templates.map((template) => (
              <Option key={template.id} value={template.id} text={template.name}>
                {template.name}
              </Option>
            ))}
          </Dropdown>
        </Grow>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton appearance="primary">Actions</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<DocumentAdd20Regular />}
                disabled={!context || capture.isPending}
                onClick={() => capture.mutate(undefined)}
              >
                Generate New Template
              </MenuItem>
              <MenuItem icon={<Play20Regular />} disabled={!draft || apply.isPending} onClick={onApply}>
                Apply Template
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<Save20Regular />} disabled={!draft || isSaving} onClick={() => void onSave()}>
                Save Template
              </MenuItem>
              <MenuItem
                icon={<Delete20Regular />}
                disabled={!selectedId || selectedId === NEW_TEMPLATE}
                onClick={() => void onDelete()}
              >
                Delete Template
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<ArrowDownload20Regular />} disabled={!draft} onClick={onExport}>
                Export Template
              </MenuItem>
              <MenuItem icon={<ArrowUpload20Regular />} onClick={() => fileInput.current?.click()}>
                Import Template
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void onImportFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </AreaToolbar>
      {draft ? (
        <FormStack>
          <Field label="Template Name" required>
            <Input
              value={draft.name}
              placeholder="Enter a template name..."
              onChange={(_, data) => setDraft({ ...draft, name: data.value })}
            />
          </Field>
          <Field label="Fields" validationMessage={jsonError ?? undefined}>
            <CodeEditor
              value={draft.json}
              language="json"
              height="300px"
              onChange={(json) => setDraft({ ...draft, json })}
            />
          </Field>
        </FormStack>
      ) : (
        <Text size={200}>
          {templates.length === 0
            ? 'No templates saved yet. Use Actions > Generate New Template to capture the current form.'
            : 'Select a template to edit or apply it, or generate a new one from the current form.'}
        </Text>
      )}
    </AreaContainer>
  )
}
