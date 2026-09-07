import {
  Badge,
  Button,
  Dropdown,
  Field,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components'
import { ArrowRight20Regular, PlugConnected20Regular } from '@fluentui/react-icons'
import { useState } from 'react'

import { FormRow, FormStack, Grow, useAppToast } from '@/shared/components'
import { getEnvironmentHttp, PAGE_CONNECTION, requestEnvironmentAccess } from '@/shared/connections'
import { useAsyncAction } from '@/shared/hooks'
import { findEnvironmentByOrigin, whoAmI } from '@/shared/lib'
import { type Environment } from '@/shared/storage'
import { type TransporterLaunch } from '@/shared/types'

import { useTransporterStore } from '../store'

const PAGE_OPTION = '__page__'

const useStyles = makeStyles({
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
})

interface ConnectionsStepProps {
  launch: TransporterLaunch
  pageAvailable: boolean
  environments: Environment[]
}

export const ConnectionsStep = ({ launch, pageAvailable, environments }: ConnectionsStepProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const { source, targetEnvironmentId, setSource, setTarget, setStep } = useTransporterStore()
  const [tested, setTested] = useState<Record<string, string>>({})
  const test = useAsyncAction('Connection test failed')

  const pageEnvironment = launch.orgOrigin ? findEnvironmentByOrigin(environments, launch.orgOrigin) : null
  const sourceEnvironmentId = source?.kind === 'environment' ? source.environmentId : null
  const sourceEnvironment = sourceEnvironmentId
    ? (environments.find((e) => e.id === sourceEnvironmentId) ?? null)
    : null
  const targetOptions = environments.filter(
    (environment) =>
      environment.id !== sourceEnvironmentId && !(source?.kind === 'page' && pageEnvironment?.id === environment.id),
  )
  const target = targetEnvironmentId ? (environments.find((e) => e.id === targetEnvironmentId) ?? null) : null
  const pageLabel = `Current page (${launch.environmentName ?? 'unknown org'})`
  const sourceValue = source === null ? '' : source.kind === 'page' ? PAGE_OPTION : source.environmentId
  const sourceLabel =
    source === null ? '' : source.kind === 'page' ? pageLabel : (sourceEnvironment?.name ?? 'Removed environment')

  const testEnvironment = (environment: Environment) =>
    test.run(async () => {
      if (!(await requestEnvironmentAccess(environment))) {
        throw new Error('Power Tools needs permission to contact the environment and the Microsoft login service')
      }
      const identity = await whoAmI(await getEnvironmentHttp(environment))
      setTested((current) => ({ ...current, [environment.id]: identity.UserId }))
      toast.success(`${environment.name} connected`, `Application user ${identity.UserId}`)
    })

  return (
    <FormStack>
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>How it works</MessageBarTitle>
          Records are read from the source with a view or FetchXML, matched to the target by primary key, then created,
          updated, or deleted in the target through its service principal. Lookups keep their ids, so the records they
          point to must already exist in the target.
        </MessageBarBody>
      </MessageBar>
      {launch.tabId !== null && !pageAvailable ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            The Dynamics tab this tool was opened from is no longer available, so only saved environments can be the
            source.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <FormRow>
        <Grow>
          <Field label="Source">
            <Dropdown
              placeholder="Choose where records are read from..."
              value={sourceLabel}
              selectedOptions={sourceValue ? [sourceValue] : []}
              onOptionSelect={(_, data) => {
                if (!data.optionValue) {
                  return
                }
                setSource(
                  data.optionValue === PAGE_OPTION
                    ? PAGE_CONNECTION
                    : { kind: 'environment', environmentId: data.optionValue },
                )
                if (data.optionValue === targetEnvironmentId) {
                  setTarget(null)
                }
              }}
            >
              {pageAvailable ? (
                <Option value={PAGE_OPTION} text={pageLabel}>
                  {pageLabel}
                </Option>
              ) : null}
              {environments.map((environment) => (
                <Option key={environment.id} value={environment.id} text={environment.name}>
                  {environment.name} (service principal)
                </Option>
              ))}
            </Dropdown>
          </Field>
        </Grow>
        <Button
          icon={<PlugConnected20Regular />}
          disabled={!sourceEnvironment || test.running}
          onClick={() => sourceEnvironment && void testEnvironment(sourceEnvironment)}
        >
          Test source
        </Button>
      </FormRow>
      <FormRow>
        <Grow>
          <Field label="Target">
            <Dropdown
              placeholder="Choose the environment to write into..."
              value={target?.name ?? ''}
              selectedOptions={targetEnvironmentId ? [targetEnvironmentId] : []}
              onOptionSelect={(_, data) => data.optionValue && setTarget(data.optionValue)}
            >
              {targetOptions.map((environment) => (
                <Option key={environment.id} value={environment.id} text={environment.name}>
                  {environment.name} (service principal)
                </Option>
              ))}
            </Dropdown>
          </Field>
        </Grow>
        <Button
          icon={<PlugConnected20Regular />}
          disabled={!target || test.running}
          onClick={() => target && void testEnvironment(target)}
        >
          Test target
        </Button>
      </FormRow>
      <div className={styles.status}>
        {Object.entries(tested).map(([id, userId]) => {
          const environment = environments.find((candidate) => candidate.id === id)
          return environment ? (
            <Badge key={id} appearance="tint" color="success" size="small" title={`Application user ${userId}`}>
              {environment.name} connected
            </Badge>
          ) : null
        })}
      </div>
      <FormRow>
        <Grow>
          <Text size={200} className={styles.hint}>
            {environments.length === 0
              ? 'No saved environment has a service principal. Add one under Settings in the popup before continuing.'
              : 'The target must differ from the source. Writes run as the target environment’s application user.'}
          </Text>
        </Grow>
        <Button
          appearance="primary"
          icon={<ArrowRight20Regular />}
          disabled={source === null || target === null}
          onClick={() => setStep('query')}
        >
          Continue to query
        </Button>
      </FormRow>
    </FormStack>
  )
}
