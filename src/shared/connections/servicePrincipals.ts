import {
  type Environment,
  type ServicePrincipal,
  type ServicePrincipals,
  servicePrincipalsItem,
} from '@/shared/storage'

export const principalFor = (environment: Environment, principals: ServicePrincipals): ServicePrincipal | null =>
  environment.servicePrincipalId ? (principals[environment.servicePrincipalId] ?? null) : null

export const isConnectable = (environment: Environment, principals: ServicePrincipals): boolean =>
  principalFor(environment, principals) !== null

export const connectableEnvironments = (environments: Environment[], principals: ServicePrincipals): Environment[] =>
  environments.filter((environment) => isConnectable(environment, principals))

export const resolveServicePrincipal = async (environment: Environment): Promise<ServicePrincipal | null> =>
  principalFor(environment, await servicePrincipalsItem.getValue())
