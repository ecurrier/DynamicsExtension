import {
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
import { Open20Regular } from '@fluentui/react-icons'

import { pageKeys, usePageMutation, usePageQuery } from '@/messaging/client'
import { AreaContainer, FormRow, FormStack, Grow, HostAccessBanner, useAppToast } from '@/shared/components'
import { ensureHostAccess, openExtensionPage } from '@/shared/extension'
import { useAsyncAction } from '@/shared/hooks'
import { resolveOrgOrigin } from '@/shared/lib'
import { traceViewerLaunchItem } from '@/shared/storage'
import { useSessionStore } from '@/shared/stores'
import { TRACE_LOG_SETTING_LABELS, TRACE_LOG_SETTINGS, type TraceLogSetting } from '@/shared/types'

const useStyles = makeStyles({
  hint: {
    color: tokens.colorNeutralForeground3,
  },
})

const ACCESS_REASON =
  'The viewer reads traces through this tab, and can only reconnect after the page navigates with access to the site.'

const SETTING_HINTS: Record<TraceLogSetting, string> = {
  0: 'Plug-ins write no trace logs. Turn this on before reproducing an issue.',
  1: 'Trace logs are kept only when a plug-in throws an exception.',
  2: 'Every plug-in execution writes a trace log. Turn this off again when you are done to limit storage growth.',
}

export const PluginTracesArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const tabId = useSessionStore((state) => state.tabId)
  const tabUrl = useSessionStore((state) => state.tabUrl)
  const details = usePageQuery('settings.getEnvironmentDetails', undefined)
  const setting = usePageQuery('traces.getSetting', undefined)
  const updateSetting = usePageMutation('traces.setSetting', {
    invalidates: () => (tabId === null ? [] : [pageKeys.command(tabId, 'traces.getSetting', null)]),
    onSuccess: (_, args) => toast.success(`Plug-in trace logging set to ${TRACE_LOG_SETTING_LABELS[args.value]}`),
  })
  const launch = useAsyncAction('Could not open the trace viewer')
  const orgOrigin = resolveOrgOrigin(details.data?.modelDrivenAppUrl ?? null, tabUrl)

  const openViewer = () =>
    launch.run(async () => {
      if (tabId === null || !orgOrigin) {
        throw new Error('Open a model-driven app in the active tab first')
      }
      const granted = await ensureHostAccess([`${orgOrigin}/*`])
      await traceViewerLaunchItem.setValue({
        tabId,
        orgOrigin,
        environmentName: details.data?.environmentName ?? orgOrigin,
        launchedAt: new Date().toISOString(),
      })
      await openExtensionPage('/plugin-traces.html')
      if (!granted) {
        toast.info(
          'Viewer opened with limited access',
          'Without site access the viewer stops working when this tab navigates. Grant access next time to keep it connected.',
        )
      }
    })

  return (
    <AreaContainer>
      <FormStack>
        <HostAccessBanner origin={orgOrigin} reason={ACCESS_REASON} />
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>Plug-in trace logs</MessageBarTitle>
            The viewer opens in its own tab and reads trace logs through this Dynamics tab, so keep it open while you
            work. Filter by type, message, entity, time, or correlation id, inspect message blocks and exceptions, and
            delete logs you no longer need.
          </MessageBarBody>
        </MessageBar>
        <FormRow>
          <Grow>
            <Field label="Plug-in trace logging">
              <Dropdown
                placeholder={setting.isLoading ? 'Loading...' : 'Select a level...'}
                value={setting.data === undefined ? '' : TRACE_LOG_SETTING_LABELS[setting.data]}
                selectedOptions={setting.data === undefined ? [] : [String(setting.data)]}
                disabled={setting.data === undefined || updateSetting.isPending}
                onOptionSelect={(_, data) => {
                  if (data.optionValue) {
                    updateSetting.mutate({ value: Number(data.optionValue) as TraceLogSetting })
                  }
                }}
              >
                {TRACE_LOG_SETTINGS.map((value) => (
                  <Option key={value} value={String(value)} text={TRACE_LOG_SETTING_LABELS[value]}>
                    {TRACE_LOG_SETTING_LABELS[value]}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </Grow>
          <Button
            appearance="primary"
            icon={<Open20Regular />}
            disabled={launch.running || tabId === null}
            onClick={() => void openViewer()}
          >
            {launch.running ? 'Opening...' : 'Open Trace Viewer'}
          </Button>
        </FormRow>
        {setting.isError ? <Text size={200}>{setting.error.message}</Text> : null}
        {setting.data !== undefined ? (
          <Text size={200} className={styles.hint}>
            {SETTING_HINTS[setting.data]}
          </Text>
        ) : null}
      </FormStack>
    </AreaContainer>
  )
}
