import { defineHandlers } from '@/messaging/page'
import { getGlobalContext, getXrm, pageHttp, runOperation } from '@/page/xrm'
import { normalizeGuid, securityOperations } from '@/shared/lib'
import { type CurrentUser } from '@/shared/types'

const operations = () => {
  getXrm()
  return securityOperations(pageHttp())
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
  'security.getSecurityRoles': () => runOperation(() => operations().getSecurityRoles()),
  'security.getBusinessUnits': () => runOperation(() => operations().getBusinessUnits()),
  'security.searchSystemUsers': ({ query }) => runOperation(() => operations().searchSystemUsers(query)),
  'security.getUserSecurityRoles': ({ systemUserId, businessUnitId }) =>
    runOperation(() => operations().getUserSecurityRoles(systemUserId, businessUnitId)),
  'security.getSystemUserRoles': ({ systemUserId }) =>
    runOperation(() => operations().getSystemUserRoles(systemUserId)),
  'security.applySecurityRoleChanges': (changes) => runOperation(() => operations().applySecurityRoleChanges(changes)),
})
