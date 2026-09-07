import { type EnvironmentAlert } from '@/shared/types'

import { originOf } from './url'

interface EnvironmentLike {
  modelDrivenAppUrl: string
}

interface AlertEnvironmentLike extends EnvironmentLike {
  alert: EnvironmentAlert | null
}

export interface ActiveAlert<T> {
  environment: T
  alert: EnvironmentAlert
}

export const findEnvironmentByOrigin = <T extends EnvironmentLike>(
  environments: T[],
  url: string | null | undefined,
): T | null => {
  const origin = originOf(url)
  if (!origin) {
    return null
  }
  return environments.find((environment) => originOf(environment.modelDrivenAppUrl) === origin) ?? null
}

export const activeAlertFor = <T extends AlertEnvironmentLike>(
  environments: T[],
  url: string | null | undefined,
): ActiveAlert<T> | null => {
  const origin = originOf(url)
  if (!origin) {
    return null
  }
  for (const environment of environments) {
    const alert = environment.alert
    if (alert?.enabled && alert.message.trim() && originOf(environment.modelDrivenAppUrl) === origin) {
      return { environment, alert }
    }
  }
  return null
}
