import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import { ShieldTask20Regular, TargetArrow20Regular } from '@fluentui/react-icons'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { useSecurityGateway } from '@/modules/security'
import {
  AreaContainer,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FormRow,
  FormStack,
  Grow,
  InfoTip,
  PageRequirementGate,
  useAppToast,
  UserPicker,
} from '@/shared/components'
import { isGuid } from '@/shared/lib'
import {
  type AccessPrivilege,
  type AccessRole,
  type AccessShare,
  type AccessTeam,
  type SystemUser,
} from '@/shared/types'

import { InvestigateConnection, TablePicker } from '../../components'
import { useInvestigateGateway, usePageTarget } from '../../hooks'
import { accessReasons, accessSummary, describeRights } from '../../lib'
import { useInvestigateStore } from '../../store'

const useStyles = makeStyles({
  caption: {
    color: tokens.colorNeutralForeground3,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
})

export const AccessArea = () => {
  const styles = useStyles()
  const toast = useAppToast()
  const connection = useInvestigateStore((state) => state.connection)
  const table = useInvestigateStore((state) => state.table)
  const recordId = useInvestigateStore((state) => state.recordId)
  const setRecordId = useInvestigateStore((state) => state.setRecordId)
  const gateway = useInvestigateGateway(connection)
  const security = useSecurityGateway(connection)
  const pageTarget = usePageTarget()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)

  const search = useMutation({
    mutationFn: (query: string) => security.ops.searchSystemUsers({ query }),
    onSuccess: (results) => {
      setUsers(results)
      if (results.length === 0) {
        toast.info('No users matched that search')
      }
    },
    onError: (error) => toast.error('User search failed', error),
  })

  const check = useMutation({
    mutationFn: () =>
      gateway.ops.getRecordAccess({
        entityLogicalName: table,
        recordId,
        systemUserId: selectedUser?.id ?? '',
      }),
    onError: (error) => toast.error('Could not check access', error),
  })

  const report = check.data ?? null
  const ready = gateway.ready && table.trim().length > 0 && isGuid(recordId.trim()) && !!selectedUser
  const pageRecord = pageTarget.data?.recordId ?? null

  const roleColumns = useMemo<DataTableColumn<AccessRole>[]>(
    () => [
      { id: 'name', label: 'Role', width: 220, render: (row) => row.name, sortValue: (row) => row.name },
      {
        id: 'source',
        label: 'Assigned via',
        width: 180,
        render: (row) =>
          row.viaTeam ? (
            <Badge appearance="tint" size="small" color="warning">{`Team: ${row.viaTeam}`}</Badge>
          ) : (
            <Badge appearance="tint" size="small">
              Direct
            </Badge>
          ),
        sortValue: (row) => row.viaTeam ?? '',
      },
      {
        id: 'bu',
        label: 'Business unit',
        width: 180,
        render: (row) => row.businessUnitName ?? '—',
        sortValue: (row) => row.businessUnitName,
      },
    ],
    [],
  )

  const privilegeColumns = useMemo<DataTableColumn<AccessPrivilege>[]>(
    () => [
      {
        id: 'name',
        label: 'Privilege',
        width: 260,
        render: (row) => <span className={styles.mono}>{row.name}</span>,
        sortValue: (row) => row.name,
      },
      { id: 'depth', label: 'Depth', width: 120, render: (row) => row.depthLabel, sortValue: (row) => row.depthLabel },
    ],
    [styles],
  )

  const teamColumns = useMemo<DataTableColumn<AccessTeam>[]>(
    () => [
      { id: 'name', label: 'Team', width: 220, render: (row) => row.name, sortValue: (row) => row.name },
      {
        id: 'type',
        label: 'Type',
        width: 200,
        render: (row) => row.teamTypeLabel,
        sortValue: (row) => row.teamTypeLabel,
      },
      {
        id: 'default',
        label: 'Default',
        width: 90,
        render: (row) => (row.isDefault ? 'Yes' : 'No'),
        sortValue: (row) => (row.isDefault ? 1 : 0),
      },
    ],
    [],
  )

  const shareColumns = useMemo<DataTableColumn<AccessShare>[]>(
    () => [
      {
        id: 'name',
        label: 'Shared with',
        width: 220,
        render: (row) => row.principalName,
        sortValue: (row) => row.principalName,
      },
      {
        id: 'type',
        label: 'Type',
        width: 120,
        render: (row) => row.principalType,
        sortValue: (row) => row.principalType,
      },
      {
        id: 'rights',
        label: 'Rights',
        width: 260,
        render: (row) => describeRights(row.rights),
        sortValue: (row) => row.rights.join(','),
      },
    ],
    [],
  )

  const body = (
    <FormStack>
      <TablePicker />
      <FormRow>
        <Grow>
          <Field label="Record id" required>
            <Input
              value={recordId}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(_, data) => setRecordId(data.value)}
            />
          </Field>
        </Grow>
        {pageRecord ? (
          <Tooltip content="Use the record open on the current page" relationship="label">
            <Button
              icon={<TargetArrow20Regular />}
              disabled={recordId === pageRecord}
              aria-label="Use the record from the current page"
              onClick={() => setRecordId(pageRecord)}
            />
          </Tooltip>
        ) : null}
      </FormRow>
      <UserPicker
        users={users}
        selectedUser={selectedUser}
        searching={search.isPending}
        onSearch={(query) => search.mutate(query)}
        onSelect={setSelectedUser}
      />
      <FormRow>
        <Button
          appearance="primary"
          icon={<ShieldTask20Regular />}
          disabled={!ready || check.isPending}
          onClick={() => check.mutate()}
        >
          {check.isPending ? 'Checking...' : 'Check access'}
        </Button>
      </FormRow>
      {report ? (
        <>
          <MessageBar intent={report.rights.length === 0 ? 'error' : 'success'}>
            <MessageBarBody>
              <MessageBarTitle>{accessSummary(report)}</MessageBarTitle>
              {describeRights(report.rights)}
            </MessageBarBody>
          </MessageBar>
          {accessReasons(report).length > 0 ? (
            <FormStack>
              {accessReasons(report).map((reason) => (
                <Text key={reason} size={200}>
                  {`• ${reason}`}
                </Text>
              ))}
            </FormStack>
          ) : null}
          <Accordion collapsible multiple defaultOpenItems={['privileges']}>
            <AccordionItem value="privileges">
              <AccordionHeader>
                {`Table privileges (${report.privileges.length})`}
                <InfoTip content="Privileges inherited through a team are always reported at Basic depth by the platform, whatever the team's role actually grants. Treat team-derived depth here as a lower bound." />
              </AccordionHeader>
              <AccordionPanel>
                {report.privilegesUnavailable ? (
                  <EmptyState intent="warning" title={report.privilegesUnavailable} />
                ) : (
                  <DataTable
                    items={report.privileges}
                    columns={privilegeColumns}
                    getRowId={(row) => row.name}
                    maxHeight="200px"
                    emptyMessage="No privileges on this table"
                  />
                )}
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem value="roles">
              <AccordionHeader>{`Security roles (${report.roles.length})`}</AccordionHeader>
              <AccordionPanel>
                <DataTable
                  items={report.roles}
                  columns={roleColumns}
                  getRowId={(row) => `${row.id}:${row.viaTeam ?? 'direct'}`}
                  maxHeight="200px"
                  emptyMessage="No roles assigned"
                />
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem value="teams">
              <AccordionHeader>{`Teams (${report.teams.length})`}</AccordionHeader>
              <AccordionPanel>
                <DataTable
                  items={report.teams}
                  columns={teamColumns}
                  getRowId={(row) => row.id}
                  maxHeight="200px"
                  emptyMessage="Not a member of any team"
                />
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem value="shares">
              <AccordionHeader>{`Sharing (${report.shares.length})`}</AccordionHeader>
              <AccordionPanel>
                {report.sharesUnavailable ? (
                  <EmptyState intent="warning" title={report.sharesUnavailable} />
                ) : (
                  <DataTable
                    items={report.shares}
                    columns={shareColumns}
                    getRowId={(row) => row.principalId}
                    maxHeight="200px"
                    emptyMessage="This record is not shared with anyone"
                  />
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </>
      ) : (
        <Text size={200} className={styles.caption}>
          Pick a table, a record, and a user, then check what the platform actually grants them.
        </Text>
      )}
    </FormStack>
  )

  return (
    <AreaContainer>
      <InvestigateConnection />
      {gateway.mode === 'page' ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
    </AreaContainer>
  )
}
