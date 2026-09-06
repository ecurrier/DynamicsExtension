import { AUTOMATION_KIND_LABELS, type AutomationItem } from '@/shared/types'

export const describeMessages = (messages: string[]): string => (messages.length > 0 ? messages.join(', ') : '—')

export const automationMatches = (item: AutomationItem, filter: string): boolean => {
  const term = filter.trim().toLowerCase()
  if (!term) {
    return true
  }
  return [
    item.name,
    AUTOMATION_KIND_LABELS[item.kind],
    item.owner ?? '',
    item.description ?? '',
    item.messages.join(' '),
    item.filteringAttributes.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(term)
}
