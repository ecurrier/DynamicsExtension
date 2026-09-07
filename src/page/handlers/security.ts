import { defineHandlers } from '@/messaging/page'
import { getGlobalContext, pageHttp, requireModelDrivenApp, runOperation } from '@/page/xrm'
import { normalizeGuid, securityOperations } from '@/shared/lib'
import { type CurrentUser } from '@/shared/types'

const operations = () => {
  requireModelDrivenApp()
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
  'security.searchSystemUsers': (args) => runOperation(() => operations().searchSystemUsers(args)),
  'security.getUserSecurityRoles': (args) => runOperation(() => operations().getUserSecurityRoles(args)),
  'security.getSystemUserRoles': (args) => runOperation(() => operations().getSystemUserRoles(args)),
  'security.applySecurityRoleChanges': (changes) => runOperation(() => operations().applySecurityRoleChanges(changes)),
})
