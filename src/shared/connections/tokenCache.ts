import { type AccessToken, isTokenValid } from '@/shared/lib'
import { accessTokensItem } from '@/shared/storage'

export const getCachedToken = async (key: string): Promise<AccessToken | null> => {
  const tokens = await accessTokensItem.getValue()
  const entry = tokens[key]
  return isTokenValid(entry) ? entry : null
}

export const setCachedToken = async (key: string, token: AccessToken): Promise<void> => {
  const tokens = await accessTokensItem.getValue()
  await accessTokensItem.setValue({ ...tokens, [key]: token })
}

export const clearCachedToken = async (key: string): Promise<void> => {
  const tokens = await accessTokensItem.getValue()
  if (key in tokens) {
    const next = { ...tokens }
    delete next[key]
    await accessTokensItem.setValue(next)
  }
}

export const clearCachedTokensFor = async (prefix: string): Promise<void> => {
  const tokens = await accessTokensItem.getValue()
  const next = Object.fromEntries(Object.entries(tokens).filter(([key]) => !key.startsWith(prefix)))
  if (Object.keys(next).length !== Object.keys(tokens).length) {
    await accessTokensItem.setValue(next)
  }
}
