import { invokeBackground } from '@/messaging/client'
import { ensureHostAccess } from '@/shared/extension'
import { acquireClientCredentialsToken, createDataverseHttp, type DataverseHttp, loginOrigin } from '@/shared/lib'
import { type Environment } from '@/shared/storage'

import { getCachedToken, setCachedToken } from './tokenCache'

export interface EnvironmentHttpOptions {
  forceRefresh?: boolean
}

export const environmentOrigin = (environment: Environment): string => {
  try {
    return new URL(environment.modelDrivenAppUrl.trim()).origin
  } catch {
    throw new Error(`${environment.name} does not have a valid environment URL`)
  }
}

const tokenKey = (environment: Environment): string => `${environment.id}:${environment.credentials?.clientId ?? ''}`

export const resolveEnvironmentToken = async (environment: Environment, forceRefresh = false): Promise<string> => {
  const credentials = environment.credentials
  if (!credentials) {
    throw new Error(`${environment.name} has no client credentials configured`)
  }
  const key = tokenKey(environment)
  if (!forceRefresh) {
    const cached = await getCachedToken(key)
    if (cached) {
      return cached.token
    }
  }
  await invokeBackground('auth.ensureTokenOriginRule', undefined)
  const token = await acquireClientCredentialsToken({
    loginOrigin: loginOrigin(environment.environmentType),
    tenantId: credentials.tenantId,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    resourceOrigin: environmentOrigin(environment),
  })
  await setCachedToken(key, token)
  return token.token
}

export const requestEnvironmentAccess = (environment: Environment): Promise<boolean> =>
  ensureHostAccess([`${environmentOrigin(environment)}/*`, `${loginOrigin(environment.environmentType)}/*`])

export const getEnvironmentHttp = async (
  environment: Environment,
  options: EnvironmentHttpOptions = {},
): Promise<DataverseHttp> => {
  const origin = environmentOrigin(environment)
  if (!(await requestEnvironmentAccess(environment))) {
    throw new Error('Power Tools needs permission to contact the environment and the Microsoft login service')
  }
  let refresh = options.forceRefresh ?? false
  return createDataverseHttp({
    origin,
    headers: async () => {
      const token = await resolveEnvironmentToken(environment, refresh)
      refresh = false
      return { Authorization: `Bearer ${token}` }
    },
  })
}
