import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components'
import { type ReactNode } from 'react'

const useStyles = makeStyles({
  root: {
    padding: '16px',
  },
})

interface EmptyStateProps {
  title: string
  children?: ReactNode
  intent?: 'info' | 'warning' | 'error'
}

export const EmptyState = ({ title, children, intent = 'info' }: EmptyStateProps) => {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <MessageBar intent={intent} layout="multiline">
        <MessageBarBody>
          <MessageBarTitle>{title}</MessageBarTitle>
          {children}
        </MessageBarBody>
      </MessageBar>
    </div>
  )
}
