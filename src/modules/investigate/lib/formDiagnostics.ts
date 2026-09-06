import { type FormControlDiagnostic, type FormEventHandler } from '@/shared/types'

export const handlerMatches = (handler: FormEventHandler, filter: string): boolean => {
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [handler.event, handler.target ?? '', handler.library, handler.functionName]
    .join(' ')
    .toLowerCase()
    .includes(term)
}

export const controlMatches = (control: FormControlDiagnostic, filter: string): boolean => {
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [control.name, control.label, control.controlType, control.tab ?? '', control.section ?? '']
    .join(' ')
    .toLowerCase()
    .includes(term)
}

export const controlIssue = (control: FormControlDiagnostic): string | null => {
  if (!control.visible && control.requiredLevel === 'required') {
    return 'Hidden but required'
  }
  if (!control.visible) {
    return 'Hidden'
  }
  if (control.disabled && control.requiredLevel === 'required' && !control.hasValue) {
    return 'Read-only, required, and empty'
  }
  if (control.disabled) {
    return 'Read-only'
  }
  return null
}
