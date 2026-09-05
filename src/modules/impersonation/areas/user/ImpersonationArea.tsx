import {
  Button,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import { ArrowClockwise20Regular, PersonSwap20Regular, Stop20Regular } from '@fluentui/react-icons'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { browser } from 'wxt/browser'

import { invokeBackground, usePageMutation, usePageQuery } from '@/messaging/client'
import { AreaContainer, FormStack, HostAccessBanner, useAppToast, useHostAccess, UserPicker } from '@/shared/components'
import { ensureHostAccess } from '@/shared/extension'
import { resolveOrgOrigin } from '@/shared/lib'
import { impersonationItem, useStorageItem } from '@/shared/storage'
import { useSessionStore } from '@/shared/stores'
import { type SystemUser } from '@/shared/types'

import { UserRoles } from './UserRoles'
import { formatStartedAt } from '../../lib'

const ACCESS_REASON = 'Impersonation rewrites the Web API requests this tab sends, which needs access to the site.'

const useStyles = makeStyles({
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  detail: {
    color: tokens.colorNeutralForeground3,
  },
})

export const ImpersonationArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const tabId = useSessionStore((state) => state.tabId)
  const tabUrl = useSessionStore((state) => state.tabUrl)
  const details = usePageQuery('settings.getEnvironmentDetails', undefined)
  const states = useStorageItem(impersonationItem)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [selected, setSelected] = useState<SystemUser | null>(null)

  const active = tabId === null ? null : (states.data?.[String(tabId)] ?? null)
  const orgOrigin = resolveOrgOrigin(details.data?.modelDrivenAppUrl ?? null, tabUrl)
  const access = useHostAccess(orgOrigin)

  const search = usePageMutation('security.searchSystemUsers', {
    onSuccess: (found) => {
      setUsers(found)
      setSelected(null)
      toast.success(`Found ${found.length} user${found.length === 1 ? '' : 's'}`)
    },
  })

  const start = useMutation({
    mutationFn: async (user: SystemUser) => {
      if (tabId === null || !orgOrigin) {
        throw new Error('The current tab could not be determined')
      }
      if (!(await ensureHostAccess([`${orgOrigin}/*`]))) {
        throw new Error('Power Tools needs permission to modify requests sent to this environment')
      }
      return invokeBackground('impersonation.start', {
        tabId,
        orgOrigin,
        user: { id: user.id, fullName: user.fullName, azureAdObjectId: user.azureAdObjectId },
      })
    },
    onSuccess: (state) => {
      toast.success(`Impersonating ${state.user.fullName}`, 'Reload the page for the change to take effect')
    },
  })

  const stop = useMutation({
    mutationFn: async () => {
      if (tabId === null) {
        throw new Error('The current tab could not be determined')
      }
      await invokeBackground('impersonation.stop', { tabId })
    },
    onSuccess: () => {
      toast.success('Impersonation stopped', 'Reload the page to return to your own user')
    },
  })

  const reload = () => {
    if (tabId !== null) {
      void browser.tabs.reload(tabId)
    }
  }

  const reloadButton = (
    <Tooltip content="Reload the Dynamics tab, for example after stopping impersonation" relationship="description">
      <Button icon={<ArrowClockwise20Regular />} disabled={tabId === null} onClick={reload}>
        Reload page
      </Button>
    </Tooltip>
  )

  if (active) {
    return (
      <AreaContainer>
        <FormStack>
          <MessageBar intent="warning" layout="multiline">
            <MessageBarBody>
              <MessageBarTitle>Impersonating {active.user.fullName}</MessageBarTitle>
              Since {formatStartedAt(active.startedAt)}, every Web API request this tab sends to {active.orgOrigin}{' '}
              carries the {active.header} header. Reload the page if you have not done so since starting.
            </MessageBarBody>
            <MessageBarActions>
              {reloadButton}
              <Button
                appearance="primary"
                icon={<Stop20Regular />}
                disabled={stop.isPending}
                onClick={() => stop.mutate()}
              >
                {stop.isPending ? 'Stopping...' : 'Stop impersonation'}
              </Button>
            </MessageBarActions>
          </MessageBar>
          <UserRoles systemUserId={active.user.id} fullName={active.user.fullName} />
        </FormStack>
      </AreaContainer>
    )
  }

  return (
    <AreaContainer>
      <FormStack>
        <HostAccessBanner origin={orgOrigin} reason={ACCESS_REASON} />
        <MessageBar intent="info" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>How impersonation works</MessageBarTitle>
            Power Tools adds the Dataverse impersonation header to every Web API request this tab sends to{' '}
            {orgOrigin ?? 'the environment'}, so the app loads data and saves records as the selected user. Your own
            account needs the Act on Behalf of Another User privilege, which System Administrator includes. Reload the
            page after starting or stopping.
          </MessageBarBody>
        </MessageBar>
        <UserPicker
          users={users}
          selectedUser={selected}
          searching={search.isPending}
          label="Find the user to impersonate"
          onSearch={(query) => search.mutate({ query })}
          onSelect={setSelected}
        />
        {selected ? (
          <>
            <Text size={200} className={styles.detail}>
              {selected.azureAdObjectId
                ? `Uses CallerObjectId ${selected.azureAdObjectId}`
                : `This user has no Entra object id, so the legacy MSCRMCallerID header will carry ${selected.id}`}
            </Text>
            <UserRoles systemUserId={selected.id} fullName={selected.fullName} />
          </>
        ) : null}
        <div className={styles.actions}>
          {reloadButton}
          <Button
            appearance="primary"
            icon={<PersonSwap20Regular />}
            disabled={!selected || !orgOrigin || start.isPending || access.granted !== true}
            onClick={() => {
              if (selected) {
                start.mutate(selected)
              }
            }}
          >
            {start.isPending ? 'Starting...' : 'Start impersonation'}
          </Button>
        </div>
      </FormStack>
    </AreaContainer>
  )
}
