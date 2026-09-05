import { defineHandlers, PageError } from '@/messaging/page'
import { getGlobalContext, getXrm, pageHttp } from '@/page/xrm'
import { DataverseOperationError, normalizeGuid, securityOperations } from '@/shared/lib'
import { type CurrentUser } from '@/shared/types'

const operations = () => {
  getXrm()
  return securityOperations(pageHttp())
}

const run = async <T>(action: () => Promise<T>): Promise<T> => {
  try {
    return await action()
  } catch (error) {
    if (error instanceof DataverseOperationError) {
      throw new PageError(error.code, error.message)
    }
    throw error
  }
}

export const securityHandlers = defineHandlers({
  'security.getCurrentUser': (): CurrentUser => {
    const userSettings = getGlobalContext().userSettings
    return {
      userId: normalizeGuid(userSettings.userId),
      userName: userSettings.userName,
      roleIds: userSettings.roles.get().map((role) => normalizeGuid(role.id)),
    }
  },
  'security.getSecurityRoles': () => run(() => operations().getSecurityRoles()),
  'security.getBusinessUnits': () => run(() => operations().getBusinessUnits()),
  'security.searchSystemUsers': ({ query }) => run(() => operations().searchSystemUsers(query)),
  'security.getUserSecurityRoles': ({ systemUserId, businessUnitId }) =>
    run(() => operations().getUserSecurityRoles(systemUserId, businessUnitId)),
  'security.getSystemUserRoles': ({ systemUserId }) => run(() => operations().getSystemUserRoles(systemUserId)),
  'security.applySecurityRoleChanges': (changes) => run(() => operations().applySecurityRoleChanges(changes)),
})
