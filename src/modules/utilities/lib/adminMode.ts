import { type AdminModeResult, type CapturedControlState } from '@/shared/types'

export interface AdminModeFinding {
  name: string
  label: string
  state: string
  severe: boolean
}

const describeState = (control: CapturedControlState): { state: string; severe: boolean } => {
  const parts: string[] = []
  if (!control.visible) {
    parts.push('Hidden')
  }
  if (control.disabled) {
    parts.push('Read-only')
  }
  if (control.requiredLevel === 'required') {
    parts.push('Required')
  } else if (control.requiredLevel === 'recommended') {
    parts.push('Recommended')
  }
  const severe = !control.visible && control.requiredLevel === 'required'
  return { state: parts.join(' · '), severe }
}

export const adminModeFindings = (result: AdminModeResult): AdminModeFinding[] =>
  result.snapshot.controls
    .filter((control) => !control.visible || control.disabled || control.requiredLevel !== 'none')
    .map((control) => {
      const { state, severe } = describeState(control)
      return { name: control.name, label: control.label, state, severe }
    })
    .sort((left, right) => Number(right.severe) - Number(left.severe) || left.label.localeCompare(right.label))

export const adminModeToText = (result: AdminModeResult): string => {
  const findings = adminModeFindings(result)
  if (findings.length === 0) {
    return `No controls on this form were hidden, read-only, or required (${result.total} checked).`
  }
  return [
    `${findings.length} of ${result.total} controls were restricted before admin mode ran:`,
    ...findings.map((finding) => `- ${finding.label} (${finding.name}): ${finding.state}`),
  ].join('\n')
}
