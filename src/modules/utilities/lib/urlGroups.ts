import { type GeneratedUrl } from '@/shared/types'

export interface UrlGroupEntry {
  index: number
  url: GeneratedUrl
}

export interface UrlGroup {
  name: string
  urls: UrlGroupEntry[]
}

const GROUP_ORDER = ['Record', 'Lookups', 'Developer', 'Debug']

export const groupUrls = (urls: GeneratedUrl[]): UrlGroup[] => {
  const byGroup = new Map<string, UrlGroupEntry[]>()
  urls.forEach((url, index) => {
    const name = url.group ?? 'Record'
    const entries = byGroup.get(name) ?? []
    entries.push({ index, url })
    byGroup.set(name, entries)
  })
  const rank = (name: string): number => {
    const position = GROUP_ORDER.indexOf(name)
    return position === -1 ? GROUP_ORDER.length : position
  }
  return [...byGroup.entries()]
    .map(([name, entries]) => ({ name, urls: entries }))
    .sort((left, right) => rank(left.name) - rank(right.name) || left.name.localeCompare(right.name))
}
