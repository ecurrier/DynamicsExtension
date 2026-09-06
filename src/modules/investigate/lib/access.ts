import { type RecordAccessReport } from '@/shared/types'

export const READ_ACCESS = 'ReadAccess'

export const describeRights = (rights: string[]): string =>
  rights.length === 0 ? 'No access' : rights.map((right) => right.replace('Access', '')).join(', ')

export const accessSummary = (report: RecordAccessReport): string => {
  if (report.rights.length === 0) {
    return `${report.userName} has no access to this record at all.`
  }
  if (!report.rights.includes(READ_ACCESS)) {
    return `${report.userName} cannot read this record, but does hold ${describeRights(report.rights)}.`
  }
  return `${report.userName} can ${describeRights(report.rights).toLowerCase()} this record.`
}

export const accessReasons = (report: RecordAccessReport): string[] => {
  const reasons: string[] = []
  if (report.ownerIsCurrentUser) {
    reasons.push('They own this record.')
  } else if (report.ownerName) {
    reasons.push(`The record is owned by ${report.ownerName}${report.ownerType ? ` (${report.ownerType})` : ''}.`)
  }
  if (report.recordBusinessUnitName) {
    reasons.push(
      `The record sits in the ${report.recordBusinessUnitName} business unit; the user is in ${report.userBusinessUnitName ?? 'an unknown business unit'}.`,
    )
  }
  const shared = report.shares.find((share) => share.principalId === report.systemUserId)
  if (shared) {
    reasons.push(`The record is shared directly with them (${describeRights(shared.rights)}).`)
  }
  if (report.teams.length > 0) {
    reasons.push(`They belong to ${report.teams.length} team${report.teams.length === 1 ? '' : 's'}.`)
  }
  if (report.privileges.length === 0 && !report.privilegesUnavailable) {
    reasons.push('None of their security roles grant any privilege on this table.')
  }
  return reasons
}
