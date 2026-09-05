import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Textarea,
} from '@fluentui/react-components'
import { Eye20Regular, EyeOff20Regular, PlugConnected20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { CopyButton, ExternalLinkButton, FormRow, FormStack, Grow, InfoTip } from '@/shared/components'
import { CLOUD_TYPES, type CloudType } from '@/shared/types'

import { CLOUD_TYPE_LABELS, type DraftValidation, type EnvironmentDraft, hasCredentialInput } from '../../lib'

interface EnvironmentFormProps {
  draft: EnvironmentDraft
  validation: DraftValidation | null
  testingConnection: boolean
  onChange: (draft: EnvironmentDraft) => void
  onTestConnection: () => void
}

export const EnvironmentForm = ({
  draft,
  validation,
  testingConnection,
  onChange,
  onTestConnection,
}: EnvironmentFormProps) => {
  const [revealSecret, setRevealSecret] = useState(false)
  const set = <K extends keyof EnvironmentDraft>(key: K, value: EnvironmentDraft[K]) =>
    onChange({ ...draft, [key]: value })
  const messageFor = (field: DraftValidation['field']) => (validation?.field === field ? validation.message : undefined)
  const credentialsEntered = hasCredentialInput(draft)

  return (
    <FormStack>
      <Field label="Environment Name" required validationMessage={messageFor('name')}>
        <Input
          value={draft.name}
          placeholder="Enter an environment name..."
          onChange={(_, data) => set('name', data.value)}
        />
      </Field>
      <Field label="Environment Type">
        <Dropdown
          value={CLOUD_TYPE_LABELS[draft.environmentType]}
          selectedOptions={[draft.environmentType]}
          onOptionSelect={(_, data) => data.optionValue && set('environmentType', data.optionValue as CloudType)}
        >
          {CLOUD_TYPES.map((cloudType) => (
            <Option key={cloudType} value={cloudType}>
              {CLOUD_TYPE_LABELS[cloudType]}
            </Option>
          ))}
        </Dropdown>
      </Field>
      <FormRow>
        <Grow>
          <Field label="Model-Driven Base URL" validationMessage={messageFor('modelDrivenAppUrl')}>
            <Input
              value={draft.modelDrivenAppUrl}
              placeholder="https://xxxxxxxxx.crm.dynamics.com/"
              onChange={(_, data) => set('modelDrivenAppUrl', data.value)}
            />
          </Field>
        </Grow>
        <CopyButton text={draft.modelDrivenAppUrl} label="Copy URL" iconOnly />
        <ExternalLinkButton url={draft.modelDrivenAppUrl} />
      </FormRow>
      <FormRow>
        <Grow>
          <Field label="Power Pages Base URL">
            <Input
              value={draft.powerPagesUrl}
              placeholder="https://xxxxxxxxx.powerappsportals.com/"
              onChange={(_, data) => set('powerPagesUrl', data.value)}
            />
          </Field>
        </Grow>
        <CopyButton text={draft.powerPagesUrl} label="Copy URL" iconOnly />
        <ExternalLinkButton url={draft.powerPagesUrl} />
      </FormRow>
      <FormRow>
        <Grow>
          <Field
            label={
              <>
                Environment Id
                <InfoTip content="The environment id can be found by opening the maker portal, selecting the environment, and copying it from the URL" />
              </>
            }
          >
            <Input
              value={draft.environmentId}
              placeholder="Enter an environment id"
              onChange={(_, data) => set('environmentId', data.value)}
            />
          </Field>
        </Grow>
        <CopyButton text={draft.environmentId} label="Copy id" iconOnly />
      </FormRow>
      <Field label="Notes">
        <Textarea
          value={draft.notes}
          rows={2}
          placeholder="Anything worth remembering about this environment..."
          onChange={(_, data) => set('notes', data.value)}
        />
      </Field>
      <Accordion collapsible defaultOpenItems={credentialsEntered ? ['credentials'] : []}>
        <AccordionItem value="credentials">
          <AccordionHeader>Service principal (optional)</AccordionHeader>
          <AccordionPanel>
            <FormStack>
              <MessageBar intent="warning">
                <MessageBarBody>
                  The client secret is stored unencrypted in this browser&apos;s extension storage. Use a dedicated app
                  registration with the least privilege you need, and rotate the secret regularly.
                </MessageBarBody>
              </MessageBar>
              <FormRow>
                <Grow>
                  <Field label="Tenant Id" validationMessage={messageFor('credentials')}>
                    <Input
                      value={draft.tenantId}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      onChange={(_, data) => set('tenantId', data.value)}
                    />
                  </Field>
                </Grow>
                <CopyButton text={draft.tenantId} label="Copy tenant id" iconOnly />
              </FormRow>
              <FormRow>
                <Grow>
                  <Field label="Client Id">
                    <Input
                      value={draft.clientId}
                      placeholder="Application (client) id of the app registration"
                      onChange={(_, data) => set('clientId', data.value)}
                    />
                  </Field>
                </Grow>
                <CopyButton text={draft.clientId} label="Copy client id" iconOnly />
              </FormRow>
              <Field label="Client Secret">
                <Input
                  type={revealSecret ? 'text' : 'password'}
                  value={draft.clientSecret}
                  placeholder="Client secret value"
                  autoComplete="off"
                  contentAfter={
                    <Button
                      appearance="transparent"
                      size="small"
                      icon={revealSecret ? <EyeOff20Regular /> : <Eye20Regular />}
                      aria-label={revealSecret ? 'Hide secret' : 'Show secret'}
                      onClick={() => setRevealSecret((current) => !current)}
                    />
                  }
                  onChange={(_, data) => set('clientSecret', data.value)}
                />
              </Field>
              <FormRow>
                <Button
                  icon={<PlugConnected20Regular />}
                  disabled={testingConnection || !credentialsEntered}
                  onClick={onTestConnection}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </FormRow>
            </FormStack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </FormStack>
  )
}
