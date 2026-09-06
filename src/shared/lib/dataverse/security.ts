import { type BusinessUnit, type RoleChangeSet, type SecurityRole, type SystemUser } from '@/shared/types'

import { DataverseOperationError } from './errors'
import { requireGuid } from './guards'
import { type DataverseHttp } from './http'
import { escapeFetchXmlLike } from '../fetchXmlEscape'
import { normalizeGuid } from '../guid'

const ROLE_RELATIONSHIP = 'systemuserroles_association'

const roleFetchXml = `
  <fetch>
    <entity name="role">
      <attribute name="name" />
      <attribute name="roleid" />
      <attribute name="businessunitid" />
      <order attribute="name" descending="false" />
      <filter type="and">
        <condition attribute="componentstate" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>`

const businessUnitFetchXml = `
  <fetch>
    <entity name="businessunit">
      <attribute name="businessunitid" />
      <attribute name="name" />
      <order attribute="name" descending="false" />
      <filter type="and">
        <condition attribute="isdisabled" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>`

export const systemUserSearchFetchXml = (term: string): string => `
  <fetch top="50">
    <entity name="systemuser">
      <attribute name="fullname" />
      <attribute name="systemuserid" />
      <attribute name="azureactivedirectoryobjectid" />
      <attribute name="domainname" />
      <attribute name="isdisabled" />
      <order attribute="fullname" descending="false" />
      <filter type="or">
        <condition attribute="domainname" operator="like" value="%${term}%" />
        <condition attribute="internalemailaddress" operator="like" value="%${term}%" />
        <condition attribute="fullname" operator="like" value="%${term}%" />
      </filter>
    </entity>
  </fetch>`

const userInBusinessUnitFetchXml = (systemUserId: string, businessUnitId: string): string => `
  <fetch>
    <entity name="systemuser">
      <attribute name="systemuserid" />
      <filter type="and">
        <condition attribute="systemuserid" operator="eq" value="${systemUserId}" />
        <condition attribute="businessunitid" operator="eq" value="${businessUnitId}" />
      </filter>
    </entity>
  </fetch>`

const userRolesFetchXml = (systemUserId: string, businessUnitId: string): string => `
  <fetch>
    <entity name="role">
      <attribute name="name" />
      <attribute name="roleid" />
      <attribute name="businessunitid" />
      <order attribute="name" descending="false" />
      <link-entity name="systemuserroles" from="roleid" to="roleid">
        <link-entity name="systemuser" from="systemuserid" to="systemuserid">
          <filter type="and">
            <condition attribute="systemuserid" operator="eq" value="${systemUserId}" />
            <condition attribute="businessunitid" operator="eq" value="${businessUnitId}" />
          </filter>
        </link-entity>
      </link-entity>
    </entity>
  </fetch>`

const systemUserRolesFetchXml = (systemUserId: string): string => `
  <fetch>
    <entity name="role">
      <attribute name="name" />
      <attribute name="roleid" />
      <attribute name="businessunitid" />
      <order attribute="name" descending="false" />
      <link-entity name="systemuserroles" from="roleid" to="roleid" intersect="true">
        <filter type="and">
          <condition attribute="systemuserid" operator="eq" value="${systemUserId}" />
        </filter>
      </link-entity>
    </entity>
  </fetch>`

interface RoleRecord {
  roleid: string
  name: string
  _businessunitid_value?: string | null
}

interface BusinessUnitRecord {
  businessunitid: string
  name: string
}

interface SystemUserRecord {
  systemuserid: string
  fullname?: string | null
  azureactivedirectoryobjectid?: string | null
  domainname?: string | null
  isdisabled?: boolean | null
}

const toSystemUser = (record: SystemUserRecord): SystemUser => ({
  id: normalizeGuid(record.systemuserid),
  fullName: record.fullname ?? '',
  azureAdObjectId: record.azureactivedirectoryobjectid ? normalizeGuid(record.azureactivedirectoryobjectid) : null,
  domainName: record.domainname ?? null,
  isDisabled: record.isdisabled === true,
})

const toRole = (record: RoleRecord): SecurityRole => ({
  id: normalizeGuid(record.roleid),
  name: record.name,
  businessUnitId: record._businessunitid_value ? normalizeGuid(record._businessunitid_value) : null,
})

export const fetchXmlPath = (entitySet: string, fetchXml: string): string =>
  `${entitySet}?fetchXml=${encodeURIComponent(fetchXml)}`

export interface SecurityOperations {
  getSecurityRoles: () => Promise<SecurityRole[]>
  getBusinessUnits: () => Promise<BusinessUnit[]>
  searchSystemUsers: (query: string) => Promise<SystemUser[]>
  getUserSecurityRoles: (systemUserId: string, businessUnitId: string) => Promise<SecurityRole[]>
  getSystemUserRoles: (systemUserId: string) => Promise<SecurityRole[]>
  applySecurityRoleChanges: (changes: RoleChangeSet) => Promise<void>
}

export const securityOperations = (http: DataverseHttp): SecurityOperations => {
  const retrieve = async <T>(entitySet: string, fetchXml: string): Promise<T[]> => {
    const response = await http.get<{ value?: T[] }>(fetchXmlPath(entitySet, fetchXml))
    return response?.value ?? []
  }
  return {
    getSecurityRoles: async () => (await retrieve<RoleRecord>('roles', roleFetchXml)).map(toRole),
    getBusinessUnits: async () =>
      (await retrieve<BusinessUnitRecord>('businessunits', businessUnitFetchXml)).map((record) => ({
        id: normalizeGuid(record.businessunitid),
        name: record.name,
      })),
    searchSystemUsers: async (query) => {
      const term = escapeFetchXmlLike(query.trim())
      if (!term) {
        throw new DataverseOperationError('InvalidArgument', 'Enter a name or email address to search for')
      }
      const users = await retrieve<SystemUserRecord>('systemusers', systemUserSearchFetchXml(term))
      return users.map(toSystemUser)
    },
    getUserSecurityRoles: async (systemUserId, businessUnitId) => {
      const userId = requireGuid(systemUserId, 'User')
      const unitId = requireGuid(businessUnitId, 'Business unit')
      const members = await retrieve<SystemUserRecord>('systemusers', userInBusinessUnitFetchXml(userId, unitId))
      if (members.length === 0) {
        throw new DataverseOperationError('NotFound', 'The selected user does not belong to the selected business unit')
      }
      return (await retrieve<RoleRecord>('roles', userRolesFetchXml(userId, unitId))).map(toRole)
    },
    getSystemUserRoles: async (systemUserId) => {
      const userId = requireGuid(systemUserId, 'User')
      return (await retrieve<RoleRecord>('roles', systemUserRolesFetchXml(userId))).map(toRole)
    },
    applySecurityRoleChanges: async ({ systemUserId, associateRoleIds, disassociateRoleIds }) => {
      const userId = requireGuid(systemUserId, 'User')
      const associate = associateRoleIds.map((roleId) => requireGuid(roleId, 'Role'))
      const disassociate = disassociateRoleIds.map((roleId) => requireGuid(roleId, 'Role'))
      for (const roleId of associate) {
        await http.post(`systemusers(${userId})/${ROLE_RELATIONSHIP}/$ref`, {
          '@odata.id': `${http.apiUrl}roles(${roleId})`,
        })
      }
      for (const roleId of disassociate) {
        await http.delete(`systemusers(${userId})/${ROLE_RELATIONSHIP}(${roleId})/$ref`)
      }
    },
  }
}
