import { DataverseOperationError } from './errors'
import { type DataverseHttp } from './http'

export interface PagedResult<T> {
  rows: T[]
  truncated: boolean
}

interface Page<T> {
  value?: T[]
  '@odata.nextLink'?: string
}

export const nextLinkPath = (apiUrl: string, nextLink: string): string => {
  if (!nextLink.startsWith(apiUrl)) {
    throw new DataverseOperationError('InvalidArgument', 'The next page link is not under the Web API root')
  }
  return nextLink.slice(apiUrl.length)
}

export const getAllPages = async <T>(
  http: DataverseHttp,
  path: string,
  headers?: Record<string, string>,
  maxRows = Number.POSITIVE_INFINITY,
): Promise<PagedResult<T>> => {
  const rows: T[] = []
  let next: string | null = path
  while (next) {
    const page: Page<T> | undefined = await http.request<Page<T> | undefined>('GET', next, undefined, headers)
    rows.push(...(page?.value ?? []))
    const link: string | undefined = page?.['@odata.nextLink']
    if (rows.length >= maxRows) {
      return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows || !!link }
    }
    next = link ? nextLinkPath(http.apiUrl, link) : null
  }
  return { rows, truncated: false }
}
