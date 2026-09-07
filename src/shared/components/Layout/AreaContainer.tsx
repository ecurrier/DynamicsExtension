import { makeStyles, mergeClasses } from '@fluentui/react-components'
import { type PropsWithChildren } from 'react'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
})

interface LayoutProps extends PropsWithChildren {
  className?: string
}

export const AreaContainer = ({ children, className }: LayoutProps) => {
  const styles = useStyles()
  return <div className={mergeClasses(styles.root, className)}>{children}</div>
}

export const AreaToolbar = ({ children, className }: LayoutProps) => {
  const styles = useStyles()
  return <div className={mergeClasses(styles.toolbar, className)}>{children}</div>
}

export const FormRow = ({ children, className }: LayoutProps) => {
  const styles = useStyles()
  return <div className={mergeClasses(styles.row, className)}>{children}</div>
}

export const FormStack = ({ children, className }: LayoutProps) => {
  const styles = useStyles()
  return <div className={mergeClasses(styles.stack, className)}>{children}</div>
}

export const Grow = ({ children, className }: LayoutProps) => {
  const styles = useStyles()
  return <div className={mergeClasses(styles.grow, className)}>{children}</div>
}
