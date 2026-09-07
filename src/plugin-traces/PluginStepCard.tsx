import { Badge, Button, makeStyles, Spinner, Text, tokens } from '@fluentui/react-components'
import { Pause20Regular, Play20Regular } from '@fluentui/react-icons'

import { pageKeys, usePageMutation, usePageQuery } from '@/messaging/client'
import { useExtensionSettings } from '@/modules/settings'
import { useAppToast, useConfirm } from '@/shared/components'
import { useSessionStore } from '@/shared/stores'
import { PLUGIN_STEP_MODE_LABELS, PLUGIN_STEP_STAGE_LABELS } from '@/shared/types'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  name: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: '12px',
    rowGap: '4px',
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
})

interface PluginStepCardProps {
  stepId: string
}

export const PluginStepCard = ({ stepId }: PluginStepCardProps) => {
  const styles = useStyles()
  const toast = useAppToast()
  const confirm = useConfirm()
  const tabId = useSessionStore((state) => state.tabId)
  const { settings } = useExtensionSettings()
  const step = usePageQuery('pluginSteps.get', { id: stepId })
  const setState = usePageMutation('pluginSteps.setState', {
    invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, 'pluginSteps.get', { id: stepId })]),
    onSuccess: (result, args) => {
      if (result.failed.length > 0) {
        toast.error('The step could not be changed', result.failed[0]?.message)
      } else {
        toast.success(args.enabled ? 'Step enabled' : 'Step disabled')
      }
    },
  })

  const toggle = async (enabled: boolean) => {
    if (!step.data) {
      return
    }
    if (settings.pluginStepsRequireToggleConfirmation) {
      const confirmed = await confirm({
        title: enabled ? 'Enable this step?' : 'Disable this step?',
        content: (
          <p>
            <strong>{step.data.name}</strong> {enabled ? 'starts running' : 'stops running'} for every user as soon as
            the change is saved.
          </p>
        ),
        confirmLabel: enabled ? 'Enable' : 'Disable',
      })
      if (!confirmed) {
        return
      }
    }
    setState.mutate({ ids: [stepId], enabled })
  }

  if (step.isLoading) {
    return <Spinner size="tiny" label="Loading plug-in step..." labelPosition="after" />
  }
  if (step.isError) {
    return (
      <Text size={200} className={styles.label}>
        Could not load the plug-in step: {step.error.message}
      </Text>
    )
  }
  if (!step.data) {
    return (
      <Text size={200} className={styles.label}>
        The plug-in step no longer exists.
      </Text>
    )
  }
  const detail = step.data
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold" className={styles.name} title={detail.name}>
          {detail.name}
        </Text>
        <Badge appearance="tint" size="small" color={detail.enabled ? 'success' : 'danger'}>
          {detail.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
        {detail.isManaged ? (
          <Badge appearance="outline" size="small">
            Managed
          </Badge>
        ) : null}
      </div>
      <div className={styles.grid}>
        <Text size={200} className={styles.label}>
          Type
        </Text>
        <Text size={200}>{detail.pluginTypeName}</Text>
        <Text size={200} className={styles.label}>
          Assembly
        </Text>
        <Text size={200}>
          {detail.assemblyName}
          {detail.assemblyVersion ? ` ${detail.assemblyVersion}` : ''}
        </Text>
        <Text size={200} className={styles.label}>
          Trigger
        </Text>
        <Text size={200}>
          {detail.messageName || '—'}
          {detail.primaryEntity ? ` of ${detail.primaryEntity}` : ''} ·{' '}
          {PLUGIN_STEP_STAGE_LABELS[detail.stage] ?? `Stage ${detail.stage}`} ·{' '}
          {PLUGIN_STEP_MODE_LABELS[detail.mode] ?? `Mode ${detail.mode}`} · rank {detail.rank}
        </Text>
        {detail.filteringAttributes ? (
          <>
            <Text size={200} className={styles.label}>
              Filtering attributes
            </Text>
            <Text size={200}>{detail.filteringAttributes}</Text>
          </>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Button
          size="small"
          icon={detail.enabled ? <Pause20Regular /> : <Play20Regular />}
          disabled={setState.isPending}
          onClick={() => void toggle(!detail.enabled)}
        >
          {setState.isPending ? 'Saving...' : detail.enabled ? 'Disable step' : 'Enable step'}
        </Button>
      </div>
    </div>
  )
}
