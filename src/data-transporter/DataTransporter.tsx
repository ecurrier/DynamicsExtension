import { makeStyles, Tab, TabList, Text, Title3, tokens } from '@fluentui/react-components'
import { useEffect } from 'react'

import { useConnectableEnvironments } from '@/modules/settings'
import { PAGE_CONNECTION } from '@/shared/connections'
import { type TransporterLaunch } from '@/shared/types'

import { ConnectionsStep, PlanStep, QueryStep, RunStep } from './steps'
import { type TransporterStep, useTransporterStore } from './store'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 24px 24px',
    height: '100%',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px',
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    paddingRight: '4px',
  },
})

interface DataTransporterProps {
  launch: TransporterLaunch
  pageAvailable: boolean
}

export const DataTransporter = ({ launch, pageAvailable }: DataTransporterProps) => {
  const styles = useStyles()
  const { environments, byId } = useConnectableEnvironments()
  const { step, source, targetEnvironmentId, sourceRows, plan, running, setStep, setSource } = useTransporterStore()

  useEffect(() => {
    if (pageAvailable && source === null) {
      setSource(PAGE_CONNECTION)
    }
  }, [pageAvailable, source, setSource])

  const target = targetEnvironmentId ? (byId[targetEnvironmentId] ?? null) : null
  const sourceLabel =
    source === null
      ? 'No source'
      : source.kind === 'page'
        ? `Current page (${launch.environmentName ?? 'unknown org'})`
        : (byId[source.environmentId]?.name ?? 'Removed environment')
  const canQuery = source !== null && target !== null
  const canPlan = canQuery && sourceRows.length > 0
  const canRun = canPlan && plan !== null

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>Data Transporter</Title3>
        <Text size={200} className={styles.subtitle}>
          {sourceLabel} → {target?.name ?? 'No target'}
        </Text>
      </div>
      <TabList
        selectedValue={step}
        disabled={running}
        onTabSelect={(_, data) => setStep(data.value as TransporterStep)}
      >
        <Tab value="connections">1. Connections</Tab>
        <Tab value="query" disabled={!canQuery}>
          2. Query
        </Tab>
        <Tab value="plan" disabled={!canPlan}>
          3. Plan
        </Tab>
        <Tab value="run" disabled={!canRun}>
          4. Run
        </Tab>
      </TabList>
      <div className={styles.body}>
        {step === 'connections' ? (
          <ConnectionsStep launch={launch} pageAvailable={pageAvailable} environments={environments} />
        ) : null}
        {step === 'query' ? <QueryStep target={target} /> : null}
        {step === 'plan' ? <PlanStep target={target} /> : null}
        {step === 'run' ? <RunStep target={target} /> : null}
      </div>
    </div>
  )
}
