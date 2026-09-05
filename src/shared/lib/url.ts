export const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`)

export const normalizeHttpsUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null
  }
  const withProtocol = url.startsWith('https://') ? url : `https://${url}`
  return ensureTrailingSlash(withProtocol)
}

export const getQueryParameter = (search: string, name: string): string | null => {
  const match = search.match(new RegExp(`(?:&|\\?)${name}=([^&]+)`))
  return match?.[1] ?? null
}

export const originOf = (url: string | null | undefined): string | null => {
  if (!url) {
    return null
  }
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export const resolveOrgOrigin = (
  clientUrl: string | null | undefined,
  tabUrl: string | null | undefined,
): string | null => originOf(clientUrl) ?? originOf(tabUrl)
