import { Button, Tooltip } from '@fluentui/react-components'
import { Copy20Regular } from '@fluentui/react-icons'

import { copyToClipboard } from '@/shared/lib'

import { useAppToast } from '../Toast'

interface CopyButtonProps {
  text: string | null | undefined
  label?: string
  successMessage?: string
  disabled?: boolean
  appearance?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent'
  iconOnly?: boolean
}

export const CopyButton = ({
  text,
  label = 'Copy',
  successMessage = 'Copied to clipboard',
  disabled,
  appearance = 'secondary',
  iconOnly = false,
}: CopyButtonProps) => {
  const toast = useAppToast()
  const onClick = async () => {
    if (!text) {
      return
    }
    try {
      await copyToClipboard(text)
      toast.success(successMessage)
    } catch (error) {
      toast.error('Copy failed', error)
    }
  }
  return (
    <Tooltip content={label} relationship="label">
      <Button
        appearance={appearance}
        icon={<Copy20Regular />}
        disabled={disabled || !text}
        aria-label={label}
        onClick={onClick}
      >
        {iconOnly ? null : label}
      </Button>
    </Tooltip>
  )
}
