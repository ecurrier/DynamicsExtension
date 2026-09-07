import { makeStyles, Spinner, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBackgroundOverlay,
    zIndex: 1000,
  },
  card: {
    padding: '24px 32px',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
})

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

export const LoadingOverlay = ({ visible, message }: LoadingOverlayProps) => {
  const styles = useStyles()
  if (!visible) {
    return null
  }
  return (
    <div className={styles.root} role="alert" aria-busy="true">
      <div className={styles.card}>
        <Spinner label={message ?? 'Loading...'} labelPosition="below" />
      </div>
    </div>
  )
}
