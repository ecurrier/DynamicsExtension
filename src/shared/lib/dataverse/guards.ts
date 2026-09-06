import { DataverseOperationError } from './errors'
import { isGuid, normalizeGuid } from '../guid'

export const requireGuid = (value: string, label: string): string => {
  if (!isGuid(value)) {
    throw new DataverseOperationError('InvalidArgument', `${label} is not a valid identifier`)
  }
  return normalizeGuid(value)
}
