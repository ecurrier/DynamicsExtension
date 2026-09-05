import {
  Dropdown,
  Field,
  makeStyles,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components'
import {
  ArrowUndo20Regular,
  CloudArrowUp20Regular,
  Copy20Regular,
  Save20Regular,
  TextIndentIncrease20Regular,
} from '@fluentui/react-icons'
import { useMemo, useState } from 'react'

import { pageKeys, usePageMutation, usePageQuery } from '@/messaging/client'
import { useExtensionSettings } from '@/modules/settings'
import { AreaContainer, AreaToolbar, CodeEditor, Grow, useAppToast, useConfirm } from '@/shared/components'
import { useAsyncAction } from '@/shared/hooks'
import { copyToClipboard, formatXml } from '@/shared/lib'
import { useSessionStore } from '@/shared/stores'

import { countLines, formLabel, formSummary, validateFormXml } from '../../lib'

const useStyles = makeStyles({
  fill: {
    height: '100%',
    boxSizing: 'border-box',
  },
  editor: {
    flex: 1,
    minHeight: 0,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: tokens.colorNeutralForeground3,
  },
  dirty: {
    color: tokens.colorStatusWarningForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
})

interface Draft {
  formId: string
  text: string
}

export const FormXmlArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const tabId = useSessionStore((state) => state.tabId)
  const { settings } = useExtensionSettings()
  const forms = usePageQuery('forms.getForms', undefined)
  const controlDetails = usePageQuery('utilities.getControlDetails', undefined)
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const copy = useAsyncAction('Could not copy the form XML')

  const formList = forms.data ?? []
  const currentFormId = controlDetails.data?.controlType === 'form/edit' ? controlDetails.data.id : null
  const defaultFormId = formList.some((candidate) => candidate.id === currentFormId)
    ? currentFormId
    : (formList[0]?.id ?? null)
  const formId = selectedFormId ?? defaultFormId
  const form = formList.find((candidate) => candidate.id === formId) ?? null
  const xml = usePageQuery('forms.getFormXml', { formId: formId ?? '' }, { enabled: formId !== null })
  const loaded = useMemo(() => (xml.data === undefined ? null : formatXml(xml.data)), [xml.data])
  const activeDraft = draft && draft.formId === formId ? draft : null
  const text = activeDraft?.text ?? loaded ?? ''
  const dirty = activeDraft !== null && loaded !== null && activeDraft.text !== loaded
  const canEdit = form !== null && form.isCustomizable && loaded !== null

  const update = usePageMutation('forms.updateFormXml', {
    invalidates: (args) =>
      tabId === null ? [] : [pageKeys.command(tabId, 'forms.getFormXml', { formId: args.formId })],
    onSuccess: (_, args) => {
      toast.success(args.publish ? 'Form XML saved and published' : 'Form XML saved')
      setDraft(null)
    },
  })

  const changeForm = async (nextFormId: string) => {
    if (nextFormId === formId) {
      return
    }
    if (dirty && form) {
      const discard = await confirm({
        title: 'Discard unsaved changes?',
        content: <p>You have unsaved changes to the XML of {form.name}. Switching forms discards them.</p>,
        confirmLabel: 'Discard',
      })
      if (!discard) {
        return
      }
    }
    setDraft(null)
    setSelectedFormId(nextFormId)
  }

  const onCopy = () =>
    copy.run(async () => {
      await copyToClipboard(text)
      toast.success('Form XML copied to clipboard')
    })

  const onFormat = () => {
    if (formId && canEdit) {
      setDraft({ formId, text: formatXml(text) })
    }
  }

  const save = async (publish: boolean) => {
    if (!form || !formId) {
      return
    }
    const problem = validateFormXml(text)
    if (problem) {
      toast.error('The form XML is not valid', problem)
      return
    }
    if (settings.formsRequireSaveConfirmation) {
      const confirmed = await confirm({
        title: publish ? 'Save and publish form XML?' : 'Save form XML?',
        content: (
          <>
            <p>
              This overwrites the XML of the form <strong>{formLabel(form)}</strong>.
            </p>
            {form.isManaged ? <p>The form is managed, so saving creates an unmanaged customization layer.</p> : null}
            <p>
              <strong>A broken form definition can make records unusable until it is repaired.</strong>
            </p>
          </>
        ),
        confirmLabel: publish ? 'Save & Publish' : 'Save',
      })
      if (!confirmed) {
        return
      }
    }
    update.mutate({ formId, formXml: text, publish })
  }

  return (
    <AreaContainer className={styles.fill}>
      <AreaToolbar>
        <Grow>
          <Field label="Form">
            <Dropdown
              placeholder={forms.isLoading ? 'Loading forms...' : 'Select a form...'}
              value={form ? formLabel(form) : ''}
              selectedOptions={formId ? [formId] : []}
              disabled={formList.length === 0}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  void changeForm(data.optionValue)
                }
              }}
            >
              {formList.map((candidate) => (
                <Option key={candidate.id} value={candidate.id} text={formLabel(candidate)}>
                  {formLabel(candidate)}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </Grow>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton appearance="primary" disabled={!form}>
              Actions
            </MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<Copy20Regular />} disabled={!text || copy.running} onClick={() => void onCopy()}>
                Copy XML
              </MenuItem>
              <MenuItem icon={<TextIndentIncrease20Regular />} disabled={!canEdit} onClick={onFormat}>
                Format
              </MenuItem>
              <MenuItem icon={<ArrowUndo20Regular />} disabled={!dirty} onClick={() => setDraft(null)}>
                Reset
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Save20Regular />}
                disabled={!canEdit || !dirty || update.isPending}
                onClick={() => void save(false)}
              >
                Save
              </MenuItem>
              <MenuItem
                icon={<CloudArrowUp20Regular />}
                disabled={!canEdit || update.isPending}
                onClick={() => void save(true)}
              >
                Save & Publish
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </AreaToolbar>
      {forms.isError ? <Text size={200}>{forms.error.message}</Text> : null}
      {xml.isError ? <Text size={200}>{xml.error.message}</Text> : null}
      {forms.isSuccess && formList.length === 0 ? <Text size={200}>No forms were found for this table.</Text> : null}
      {form?.isManaged && form.isCustomizable ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            This form is managed. Saving creates an unmanaged customization layer on top of the managed solution.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {form && !form.isCustomizable ? (
        <MessageBar intent="error">
          <MessageBarBody>This form cannot be customized, so its XML is read-only.</MessageBarBody>
        </MessageBar>
      ) : null}
      {form ? (
        <div className={styles.status}>
          <Text size={200}>{formSummary(form, countLines(text))}</Text>
          {dirty ? (
            <Text size={200} className={styles.dirty}>
              Unsaved changes
            </Text>
          ) : null}
          {update.isPending ? <Text size={200}>Saving...</Text> : null}
        </div>
      ) : null}
      <div className={styles.editor}>
        <CodeEditor
          fill
          value={text}
          language="xml"
          readOnly={!canEdit}
          placeholder={xml.isLoading ? 'Loading form XML...' : 'Select a form to view its XML'}
          onChange={(value) => {
            if (formId && canEdit) {
              setDraft({ formId, text: value })
            }
          }}
        />
      </div>
    </AreaContainer>
  )
}
