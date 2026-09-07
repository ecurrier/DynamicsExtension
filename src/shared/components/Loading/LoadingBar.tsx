import { makeStyles, ProgressBar } from '@fluentui/react-components'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

const useStyles = makeStyles({
  root: {
    height: '4px',
  },
})

export const LoadingBar = () => {
  const styles = useStyles()
  const active = useIsFetching() + useIsMutating() > 0
  return <div className={styles.root}>{active ? <ProgressBar thickness="medium" /> : null}</div>
}
